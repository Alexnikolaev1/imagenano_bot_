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

export class HfSpaceVideoApiClient {
  constructor(private config: HfSpaceVideoApiConfig) {}

  async generateFromPrompt(prompt: string, imageUrl?: string): Promise<VideoResult> {
    const data = [
      prompt.trim(),
      this.config.negativePrompt,
      this.config.width,
      this.config.height,
      this.config.numFrames,
      this.config.seed,
      imageUrl?.trim() || '',
    ];

    try {
      logInfo('HF Space video submit', {
        baseUrl: this.config.baseUrl,
        prompt: prompt.slice(0, 80),
        hasImageUrl: Boolean(imageUrl?.trim()),
      });

      const eventId = await this.submitCall(data);
      const output = await this.pollUntilComplete(eventId);
      return await this.downloadVideoOutput(output);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logError('HF Space video failed', { message });
      return mapClientError(message);
    }
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

  private async pollUntilComplete(eventId: string): Promise<unknown> {
    const deadline = Date.now() + this.config.timeoutMs;
    const pollUrl = `${this.config.baseUrl}/gradio_api/call/generate_video/${eventId}`;

    while (Date.now() < deadline) {
      const res = await fetch(pollUrl, {
        headers: this.authHeaders(),
        signal: AbortSignal.timeout(60_000),
      });

      const text = await res.text();
      if (!res.ok) {
        throw new Error(normalizeHttpError(res.status, text));
      }

      const parsed = parsePollResponse(text);
      if (parsed.status === 'error') {
        throw new Error(parsed.error || 'hf_space_error');
      }
      if (parsed.status === 'complete') {
        return parsed.output;
      }

      await sleep(this.config.pollIntervalMs);
    }

    throw new Error('hf_space_timeout');
  }

  private async downloadVideoOutput(output: unknown): Promise<VideoResult> {
    const file = extractFileData(output);
    if (!file) {
      logWarn('HF Space output without file', { output });
      return { success: false, error: 'hf_space_no_video' };
    }

    const downloadUrl =
      file.url ||
      (file.path ? `${this.config.baseUrl}/gradio_api/file=${encodeURIComponent(file.path)}` : undefined);

    if (!downloadUrl) return { success: false, error: 'hf_space_no_video' };

    const res = await fetch(downloadUrl, {
      headers: this.authHeaders(),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      logWarn('HF Space video download failed', { status: res.status, url: downloadUrl.slice(0, 100) });
      return { success: false, error: 'hf_space_no_video' };
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) return { success: false, error: 'hf_space_no_video' };

    logInfo('HF Space video downloaded', { bytes: buf.length });
    return {
      success: true,
      mode: 'video',
      videoBase64: buf.toString('base64'),
      mimeType: file.mime_type || 'video/mp4',
    };
  }
}

function parsePollResponse(text: string): {
  status: 'pending' | 'complete' | 'error';
  output?: unknown;
  error?: string;
} {
  const trimmed = text.trim();
  if (!trimmed) return { status: 'pending' };

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const json = JSON.parse(trimmed) as Record<string, unknown>;
      if (json.error) return { status: 'error', error: String(json.error) };
      if (json.output !== undefined) return { status: 'complete', output: json.output };
      if (Array.isArray(json)) {
        const last = json[json.length - 1];
        if (last && typeof last === 'object') return { status: 'complete', output: last };
      }
    } catch {
      // fall through to SSE parsing
    }
  }

  let lastData: unknown;
  for (const line of text.split('\n')) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(line.indexOf(':') + 1).trim();
    if (!payload || payload === 'null') continue;
    try {
      lastData = JSON.parse(payload);
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
    if (lastData[0] === 'complete' || extractFileData(lastData[1] ?? lastData)) {
      return { status: 'complete', output: lastData[1] ?? lastData };
    }
  }

  if (typeof lastData === 'object' && lastData !== null && extractFileData(lastData)) {
    return { status: 'complete', output: lastData };
  }

  return { status: 'pending' };
}

interface GradioFileData {
  path?: string;
  url?: string;
  mime_type?: string;
}

function extractFileData(output: unknown): GradioFileData | null {
  if (!output) return null;
  if (typeof output === 'object' && !Array.isArray(output)) {
    const obj = output as GradioFileData;
    if (obj.path || obj.url) return obj;
  }
  if (Array.isArray(output)) {
    for (const item of output) {
      const file = extractFileData(item);
      if (file) return file;
    }
  }
  return null;
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

function mapClientError(message: string): VideoResult {
  if (
    message === 'hf_space_timeout' ||
    message === 'hf_space_no_video' ||
    message === 'hf_space_bad_response' ||
    message === 'hf_space_error' ||
    message === 'hf_space_sleeping' ||
    message === 'hf_auth_error' ||
    message === 'rate_limit' ||
    message === 'hf_space_upload_failed'
  ) {
    return { success: false, error: message };
  }
  if (/timeout|aborted/i.test(message)) return { success: false, error: 'hf_space_timeout' };
  if (/sleeping|queue|503|loading/i.test(message)) return { success: false, error: 'hf_space_sleeping' };
  return { success: false, error: message.slice(0, 200) || 'hf_space_error' };
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
  const numFrames = parseInt(process.env.HF_VIDEO_FRAMES || '49', 10);
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
