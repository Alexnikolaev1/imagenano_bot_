// Google Colab + ngrok FastAPI — POST multipart/form-data, field "image"

import { logError, logInfo, logWarn } from '../../utils/logger';
import type { VideoResult } from '../../types';

export interface ColabVideoApiConfig {
  apiUrl: string;
  timeoutMs: number;
  /** ngrok free tier shows an interstitial without this header */
  skipNgrokBrowserWarning: boolean;
}

export class ColabVideoApiClient {
  private endpointUrls: string[];

  constructor(private config: ColabVideoApiConfig) {
    this.endpointUrls = buildEndpointCandidates(config.apiUrl);
    logInfo('Colab video API endpoints', { candidates: this.endpointUrls });
  }

  async generateFromImage(
    imageBuffer: Buffer,
    mimeType: string,
    prompt?: string
  ): Promise<VideoResult> {
    const ext = mimeToExt(mimeType);
    const filename = `input.${ext}`;

    const headers: Record<string, string> = {};
    if (this.config.skipNgrokBrowserWarning) {
      headers['ngrok-skip-browser-warning'] = 'true';
    }

    let lastError: VideoResult = { success: false, error: 'colab_not_found' };

    for (const url of this.endpointUrls) {
      const form = new FormData();
      form.append('image', new Blob([new Uint8Array(imageBuffer)], { type: mimeType }), filename);
      if (prompt?.trim() && process.env.VIDEO_API_SEND_PROMPT === 'true') {
        form.append('prompt', prompt.trim());
      }

      try {
        logInfo('Colab video API request', { url, bytes: imageBuffer.length, mimeType });

        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: form,
          signal: AbortSignal.timeout(this.config.timeoutMs),
        });

        const contentType = res.headers.get('content-type') || '';

        if (!res.ok) {
          const errText = await res.text();
          logWarn('Colab video API error', { url, status: res.status, body: errText.slice(0, 500) });
          lastError = mapHttpError(res.status, errText);
          if (res.status === 404) continue;
          return lastError;
        }

        return await parseSuccessResponse(res, contentType);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logError('Colab video API request failed', { url, message });
        lastError =
          message.includes('timeout') || message.includes('aborted')
            ? { success: false, error: 'colab_timeout' }
            : { success: false, error: 'colab_offline' };
      }
    }

    return lastError;
  }
}

async function parseSuccessResponse(res: Response, contentType: string): Promise<VideoResult> {
  if (contentType.includes('video') || contentType.includes('octet-stream')) {
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) return { success: false, error: 'colab_empty_video' };
    logInfo('Colab video API returned binary', { bytes: buf.length, contentType });
    return {
      success: true,
      mode: 'video',
      videoBase64: buf.toString('base64'),
      mimeType: contentType.includes('video') ? contentType.split(';')[0] : 'video/mp4',
    };
  }

  const text = await res.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    if (text.includes('ngrok') || text.includes('<!DOCTYPE')) {
      return { success: false, error: 'colab_ngrok_page' };
    }
    logError('Colab video API unexpected response', { contentType, body: text.slice(0, 300) });
    return { success: false, error: 'colab_bad_response' };
  }

  const videoUrl = extractVideoUrl(body);
  if (videoUrl) {
    logInfo('Colab video API returned URL', { url: videoUrl.slice(0, 80) });
    return { success: true, mode: 'video', videoUrl };
  }

  const b64 = extractVideoBase64(body);
  if (b64) {
    return { success: true, mode: 'video', videoBase64: b64, mimeType: 'video/mp4' };
  }

  logWarn('Colab video API JSON without video', { body });
  return { success: false, error: 'colab_no_video' };
}

function mapHttpError(status: number, errText: string): VideoResult {
  if (status === 422) return { success: false, error: 'colab_bad_request' };
  if (status === 404) {
    if (errText.includes('<!DOCTYPE') || errText.toLowerCase().includes('ngrok')) {
      return { success: false, error: 'colab_ngrok_page' };
    }
    return { success: false, error: 'colab_not_found' };
  }
  if (status >= 500) return { success: false, error: 'colab_server_error' };
  return { success: false, error: `colab_api_error_${status}` };
}

function stripEnvValue(raw: string): string {
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/** Build POST URLs to try (FastAPI is picky about trailing slashes). */
function buildEndpointCandidates(raw: string): string[] {
  const input = stripEnvValue(raw);
  const withoutPath = input.replace(/\/generate_video\/?$/i, '').replace(/\/+$/, '');
  const base = withoutPath || input.replace(/\/+$/, '');

  const candidates = [
    `${base}/generate_video/`,
    `${base}/generate_video`,
    input.endsWith('/') ? input : `${input}/`,
    input,
    `${base}/`,
  ];

  const seen = new Set<string>();
  return candidates
    .map((u) => u.trim())
    .filter((u) => u.startsWith('http'))
    .filter((u) => {
      if (seen.has(u)) return false;
      seen.add(u);
      return true;
    });
}

function mimeToExt(mimeType: string): string {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  return 'jpg';
}

function extractVideoUrl(body: Record<string, unknown>): string | undefined {
  if (typeof body.video_url === 'string') return body.video_url;
  if (typeof body.url === 'string') return body.url;
  const video = body.video as Record<string, unknown> | undefined;
  if (video?.url && typeof video.url === 'string') return video.url;
  const output = body.output as Record<string, unknown> | undefined;
  if (output?.url && typeof output.url === 'string') return output.url;
  return undefined;
}

function extractVideoBase64(body: Record<string, unknown>): string | undefined {
  if (typeof body.video_base64 === 'string') return body.video_base64;
  if (typeof body.base64 === 'string') return body.base64;
  const video = body.video as Record<string, unknown> | undefined;
  if (video?.base64 && typeof video.base64 === 'string') return video.base64;
  return undefined;
}

export function createColabVideoApiFromEnv(): ColabVideoApiClient | null {
  const raw = process.env.VIDEO_API?.trim();
  if (!raw) return null;
  const apiUrl = stripEnvValue(raw);
  if (!apiUrl) return null;

  const timeoutMs = parseInt(process.env.VIDEO_API_TIMEOUT_MS || '600000', 10);
  const skipNgrokBrowserWarning = process.env.VIDEO_API_SKIP_NGROK_WARNING !== 'false';

  return new ColabVideoApiClient({ apiUrl, timeoutMs, skipNgrokBrowserWarning });
}
