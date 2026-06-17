// Hugging Face Space — Gradio API (LTX-Video via alex555196/videobot)

import { resolveHfVideoSpaceFromEnv } from '../../config';
import { logError, logInfo, logWarn } from '../../utils/logger';
import type { VideoResult } from '../../types';

export interface HfSpaceVideoApiConfig {
  baseUrl: string;
  apiToken?: string;
  timeoutMs: number;
  pollIntervalMs: number;
  width: number;
  height: number;
  numFrames: number;
  seed: number;
  negativePrompt: string;
}

export type HfPollOnceResult =
  | { status: 'pending' }
  | { status: 'complete'; output: unknown }
  | { status: 'error'; error: string };

export class HfSpaceVideoApiClient {
  constructor(private config: HfSpaceVideoApiConfig) {}

  async submitGeneration(prompt: string, imageUrl?: string): Promise<string> {
    const data = [
      prompt.trim(),
      this.config.negativePrompt,
      this.config.width,
      this.config.height,
      this.config.numFrames,
      this.config.seed,
      imageUrl?.trim() || '',
    ];

    logInfo('HF Space video submit', {
      baseUrl: this.config.baseUrl,
      prompt: prompt.slice(0, 80),
      hasImageUrl: Boolean(imageUrl?.trim()),
    });

    return this.submitCall(data);
  }

  /**
   * Hold the Gradio SSE connection until complete or budget exhausted.
   * Short polls + reconnect lose the result — Gradio does not replay "complete" on a new GET.
   */
  async pollUntilReady(eventId: string, maxMs: number): Promise<HfPollOnceResult> {
    const pollUrl = `${this.config.baseUrl}/gradio_api/call/generate_video/${eventId}`;
    const deadline = Date.now() + maxMs;
    let reconnect = 0;
    const maxReconnects = parseInt(process.env.HF_VIDEO_MAX_RECONNECTS || '2', 10);

    while (Date.now() < deadline && reconnect <= maxReconnects) {
      const remaining = deadline - Date.now();
      const fetchMs = Math.min(Math.max(remaining, 20_000), 275_000);

      logInfo('HF Space poll: opening SSE', {
        eventId,
        reconnect,
        fetchSec: Math.round(fetchMs / 1000),
      });

      try {
        const res = await fetch(pollUrl, {
          headers: this.authHeaders(),
          signal: AbortSignal.timeout(fetchMs),
        });

        const text = await res.text();

        if (!res.ok) {
          return { status: 'error', error: normalizeHttpError(res.status, text) };
        }

        const parsed = parsePollResponse(text);
        logInfo('HF Space poll: SSE closed', {
          eventId,
          reconnect,
          status: parsed.status,
          bytes: text.length,
        });

        if (parsed.status === 'error') {
          return { status: 'error', error: parsed.error || 'hf_space_error' };
        }
        if (parsed.status === 'complete' && parsed.output !== undefined) {
          return { status: 'complete', output: parsed.output };
        }

        if (Date.now() < deadline) {
          reconnect += 1;
          await sleep(3000);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (/timeout|aborted/i.test(message) && Date.now() < deadline) {
          reconnect += 1;
          logInfo('HF Space poll: SSE timeout, reconnecting', { eventId, reconnect, message });
          await sleep(3000);
          continue;
        }
        throw err;
      }
    }

    return { status: 'pending' };
  }

  async downloadVideoOutput(output: unknown): Promise<VideoResult> {
    const file = extractVideoFileData(output);
    if (!file) {
      logWarn('HF Space output without video file', { output });
      return { success: false, error: 'hf_space_no_video' };
    }

    const candidates = buildGradioDownloadUrls(this.config.baseUrl, file);
    logInfo('HF Space video download candidates', {
      paths: candidates.map((u) => u.slice(0, 100)),
    });

    for (const downloadUrl of candidates) {
      try {
        const res = await fetch(downloadUrl, {
          headers: this.authHeaders(),
          signal: AbortSignal.timeout(90_000),
        });

        const buf = Buffer.from(await res.arrayBuffer());
        if (!res.ok) {
          logWarn('HF Space video download HTTP error', {
            status: res.status,
            url: downloadUrl.slice(0, 100),
            bytes: buf.length,
          });
          continue;
        }

        if (!isLikelyVideoBuffer(buf)) {
          logWarn('HF Space video download not a valid video', {
            url: downloadUrl.slice(0, 100),
            bytes: buf.length,
            head: buf.subarray(0, 16).toString('hex'),
          });
          continue;
        }

        logInfo('HF Space video downloaded', { bytes: buf.length, url: downloadUrl.slice(0, 100) });

        const publicUrl = downloadUrl.startsWith('http') ? downloadUrl : undefined;
        return {
          success: true,
          mode: 'video',
          videoUrl: publicUrl,
          videoBase64: buf.toString('base64'),
          mimeType: file.mime_type || 'video/mp4',
        };
      } catch (err) {
        logWarn('HF Space video download failed', {
          url: downloadUrl.slice(0, 100),
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { success: false, error: 'hf_space_no_video' };
  }

  /** Upload image to Space temp storage; returns a URL load_image() can fetch. */
  async uploadImage(imageBuffer: Buffer, mimeType: string): Promise<string | null> {
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    const uploadId = randomUploadId();
    const url = `${this.config.baseUrl}/gradio_api/upload?upload_id=${uploadId}`;

    const form = new FormData();
    form.append('files', new Blob([new Uint8Array(imageBuffer)], { type: mimeType }), `input.${ext}`);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: this.authHeaders(),
        body: form,
        signal: AbortSignal.timeout(60_000),
      });

      if (!res.ok) {
        const text = await res.text();
        logWarn('HF Space upload failed', { status: res.status, body: text.slice(0, 300) });
        return null;
      }

      const paths = (await res.json()) as unknown;
      const path = extractUploadedPath(paths);
      if (!path) {
        logWarn('HF Space upload unexpected response', { paths });
        return null;
      }

      const fileUrl = `${this.config.baseUrl}/gradio_api/file=${encodeURIComponent(path)}`;
      logInfo('HF Space image uploaded', { path: path.slice(0, 80) });
      return fileUrl;
    } catch (err) {
      logError('HF Space upload error', err);
      return null;
    }
  }

  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.config.apiToken) {
      headers.Authorization = `Bearer ${this.config.apiToken}`;
    }
    return headers;
  }

  private async submitCall(data: unknown[]): Promise<string> {
    const res = await fetch(`${this.config.baseUrl}/gradio_api/call/generate_video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders(),
      },
      body: JSON.stringify({ data }),
      signal: AbortSignal.timeout(60_000),
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(normalizeHttpError(res.status, text));
    }

    let body: { event_id?: string; error?: string };
    try {
      body = JSON.parse(text) as { event_id?: string; error?: string };
    } catch {
      throw new Error('hf_space_bad_response');
    }

    if (body.error) throw new Error(normalizeHttpError(res.status, body.error));
    if (!body.event_id) throw new Error('hf_space_bad_response');
    return body.event_id;
  }

}

function parsePollResponse(text: string): {
  status: 'pending' | 'complete' | 'error';
  output?: unknown;
  error?: string;
} {
  const trimmed = text.trim();
  if (!trimmed) return { status: 'pending' };

  const deepFile = findFileDataInText(trimmed);
  if (deepFile) return { status: 'complete', output: deepFile };

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const json = JSON.parse(trimmed) as Record<string, unknown>;
      if (json.error) return { status: 'error', error: String(json.error) };
      if (json.output !== undefined) {
        const file = extractVideoFileDataDeep(json.output);
        if (file) return { status: 'complete', output: file };
      }
    } catch {
      // fall through to SSE parsing
    }
  }

  let lastData: unknown;
  let sawCompleteEvent = false;

  for (const line of text.split('\n')) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('event:')) {
      const eventName = trimmedLine.slice(6).trim().toLowerCase();
      if (eventName === 'complete' || eventName === 'completion') {
        sawCompleteEvent = true;
      }
      continue;
    }
    if (!trimmedLine.startsWith('data:')) continue;

    const payload = trimmedLine.slice(trimmedLine.indexOf(':') + 1).trim();
    if (!payload || payload === 'null') continue;

    try {
      lastData = JSON.parse(payload);
      const file = extractVideoFileDataDeep(lastData);
      if (file) return { status: 'complete', output: file };

      if (typeof lastData === 'object' && lastData !== null) {
        const msg = (lastData as { msg?: string }).msg;
        if (msg === 'process_completed' || msg === 'process_complete') {
          const out = (lastData as { output?: unknown }).output;
          const outFile = extractVideoFileDataDeep(out);
          if (outFile) return { status: 'complete', output: outFile };
        }
      }
    } catch {
      continue;
    }
  }

  if (lastData === undefined) return { status: 'pending' };

  if (Array.isArray(lastData)) {
    if (lastData[0] === 'error') {
      const msg = typeof lastData[1] === 'string' ? lastData[1] : 'hf_space_error';
      return { status: 'error', error: msg };
    }
    if (lastData[0] === 'complete' || sawCompleteEvent) {
      const file = extractVideoFileDataDeep(lastData[1] ?? lastData);
      if (file) return { status: 'complete', output: file };
    }
  }

  const file = extractVideoFileDataDeep(lastData);
  if (file) return { status: 'complete', output: file };

  return { status: 'pending' };
}

function findFileDataInText(text: string): GradioFileData | null {
  let lastVideo: GradioFileData | null = null;
  for (const line of text.split('\n')) {
    const trimmedLine = line.trim();
    let payload = trimmedLine;
    if (trimmedLine.startsWith('data:')) {
      payload = trimmedLine.slice(trimmedLine.indexOf(':') + 1).trim();
    }
    if (!payload.startsWith('[') && !payload.startsWith('{')) continue;
    try {
      const json = JSON.parse(payload);
      const file = extractVideoFileDataDeep(json);
      if (file) lastVideo = file;
    } catch {
      continue;
    }
  }
  return lastVideo;
}

interface GradioFileData {
  path?: string;
  url?: string;
  mime_type?: string;
}

function extractFileData(output: unknown): GradioFileData | null {
  return extractFileDataDeep(output);
}

function extractVideoFileData(output: unknown): GradioFileData | null {
  return extractVideoFileDataDeep(output);
}

function extractFileDataDeep(output: unknown): GradioFileData | null {
  if (!output) return null;
  if (typeof output === 'object' && !Array.isArray(output)) {
    const obj = output as GradioFileData & { data?: unknown; output?: unknown };
    if (obj.path || obj.url) return { path: obj.path, url: obj.url, mime_type: obj.mime_type };
    const nested = extractFileDataDeep(obj.data) ?? extractFileDataDeep(obj.output);
    if (nested) return nested;
  }
  if (Array.isArray(output)) {
    for (const item of output) {
      const file = extractFileDataDeep(item);
      if (file) return file;
    }
  }
  return null;
}

function extractVideoFileDataDeep(output: unknown): GradioFileData | null {
  if (!output) return null;
  if (typeof output === 'object' && !Array.isArray(output)) {
    const obj = output as GradioFileData & { data?: unknown; output?: unknown };
    if ((obj.path || obj.url) && isVideoFileMeta(obj)) {
      return { path: obj.path, url: obj.url, mime_type: obj.mime_type };
    }
    const nested = extractVideoFileDataDeep(obj.data) ?? extractVideoFileDataDeep(obj.output);
    if (nested) return nested;
  }
  if (Array.isArray(output)) {
    for (let i = output.length - 1; i >= 0; i--) {
      const file = extractVideoFileDataDeep(output[i]);
      if (file) return file;
    }
  }
  return null;
}

function isVideoFileMeta(file: GradioFileData): boolean {
  const ref = `${file.path || ''} ${file.url || ''} ${file.mime_type || ''}`.toLowerCase();
  if (ref.includes('.mp4') || ref.includes('.webm') || ref.includes('.mov')) return true;
  if (file.mime_type?.startsWith('video/')) return true;
  return false;
}

function isLikelyVideoBuffer(buf: Buffer): boolean {
  if (buf.length < 8_000) return false;
  if (buf.length >= 8 && buf.subarray(4, 8).toString('ascii') === 'ftyp') return true;
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return true;
  return false;
}

function buildGradioDownloadUrls(baseUrl: string, file: GradioFileData): string[] {
  const base = baseUrl.replace(/\/+$/, '');
  const urls: string[] = [];

  if (file.url) {
    if (file.url.startsWith('http://') || file.url.startsWith('https://')) {
      urls.push(file.url);
    } else {
      urls.push(`${base}${file.url.startsWith('/') ? '' : '/'}${file.url}`);
    }
  }

  if (file.path) {
    const path = file.path;
    const encoded = encodeURIComponent(path);
    urls.push(`${base}/file=${encoded}`);
    urls.push(`${base}/gradio_api/file=${encoded}`);
    if (path.startsWith('/')) {
      urls.push(`${base}/file=${path}`);
      urls.push(`${base}/gradio_api/file=${path}`);
    }
  }

  return [...new Set(urls.filter(Boolean))];
}

function extractUploadedPath(paths: unknown): string | undefined {
  if (typeof paths === 'string') return paths;
  if (Array.isArray(paths) && typeof paths[0] === 'string') return paths[0];
  return undefined;
}

function normalizeHttpError(status: number, raw: string): string {
  const lower = raw.toLowerCase();
  if (status === 401 || status === 403 || /unauthorized|invalid token|auth/i.test(lower)) {
    return 'hf_auth_error';
  }
  if (status === 429 || /rate limit|too many/i.test(lower)) return 'rate_limit';
  if (status === 503 || /sleeping|starting|loading|queue|zero gpu/i.test(lower)) {
    return 'hf_space_sleeping';
  }
  if (status >= 500) return 'hf_space_error';
  return raw.slice(0, 200) || 'hf_space_error';
}

function randomUploadId(): string {
  return Math.random().toString(36).slice(2, 14);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** alex555196/videobot → https://alex555196-videobot.hf.space */
export function resolveHfSpaceBaseUrl(raw: string): string {
  const value = raw.trim().replace(/\/+$/, '');
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  const slug = value.replace(/\//g, '-').toLowerCase();
  return `https://${slug}.hf.space`;
}

export function createHfSpaceVideoApi(spaceRaw: string): HfSpaceVideoApiClient {
  const apiToken =
    process.env.HUGGINGFACE_TOKEN?.trim() || process.env.HF_TOKEN?.trim() || undefined;

  const baseUrl = resolveHfSpaceBaseUrl(spaceRaw);
  const timeoutMs = parseInt(process.env.HF_VIDEO_TIMEOUT_MS || '600000', 10);
  const pollIntervalMs = parseInt(process.env.HF_VIDEO_POLL_INTERVAL_MS || '3000', 10);
  const width = parseInt(process.env.HF_VIDEO_WIDTH || '768', 10);
  const height = parseInt(process.env.HF_VIDEO_HEIGHT || '448', 10);
  const numFrames = parseInt(process.env.HF_VIDEO_FRAMES || '25', 10);
  const seed = parseInt(process.env.HF_VIDEO_SEED || '42', 10);
  const negativePrompt =
    process.env.HF_VIDEO_NEGATIVE_PROMPT?.trim() ||
    'worst quality, inconsistent motion, blurry, jittery, distorted, deformed, low quality, noise';

  logInfo('HF Space video configured', { baseUrl, width, height, numFrames });

  return new HfSpaceVideoApiClient({
    baseUrl,
    apiToken,
    timeoutMs,
    pollIntervalMs,
    width,
    height,
    numFrames,
    seed,
    negativePrompt,
  });
}

export function createHfSpaceVideoApiFromEnv(): HfSpaceVideoApiClient | null {
  const spaceRaw = resolveHfVideoSpaceFromEnv();
  if (!spaceRaw) return null;
  return createHfSpaceVideoApi(spaceRaw);
}
