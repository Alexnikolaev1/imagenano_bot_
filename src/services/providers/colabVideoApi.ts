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
  constructor(private config: ColabVideoApiConfig) {}

  async generateFromImage(
    imageBuffer: Buffer,
    mimeType: string,
    prompt?: string
  ): Promise<VideoResult> {
    const url = normalizeApiUrl(this.config.apiUrl);
    const ext = mimeToExt(mimeType);
    const filename = `input.${ext}`;

    const form = new FormData();
    form.append('image', new Blob([imageBuffer], { type: mimeType }), filename);
    if (prompt?.trim() && process.env.VIDEO_API_SEND_PROMPT === 'true') {
      form.append('prompt', prompt.trim());
    }

    const headers: Record<string, string> = {};
    if (this.config.skipNgrokBrowserWarning) {
      headers['ngrok-skip-browser-warning'] = 'true';
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
        logWarn('Colab video API error', { status: res.status, body: errText.slice(0, 500) });
        if (res.status === 422) return { success: false, error: 'colab_bad_request' };
        if (res.status >= 500) return { success: false, error: 'colab_server_error' };
        return { success: false, error: `colab_api_error_${res.status}` };
      }

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
          return { success: false, error: 'colab_offline' };
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logError('Colab video API request failed', { message });
      if (message.includes('timeout') || message.includes('aborted')) {
        return { success: false, error: 'colab_timeout' };
      }
      return { success: false, error: 'colab_offline' };
    }
  }
}

function normalizeApiUrl(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
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
  const apiUrl = process.env.VIDEO_API?.trim();
  if (!apiUrl) return null;

  const timeoutMs = parseInt(process.env.VIDEO_API_TIMEOUT_MS || '600000', 10);
  const skipNgrokBrowserWarning = process.env.VIDEO_API_SKIP_NGROK_WARNING !== 'false';

  return new ColabVideoApiClient({ apiUrl, timeoutMs, skipNgrokBrowserWarning });
}
