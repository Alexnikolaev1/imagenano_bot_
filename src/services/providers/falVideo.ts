// fal.ai queue API — real MP4 video (Wan / Kling and other models)
// Docs: https://fal.ai/docs/documentation/model-apis/inference/queue

import { logError, logInfo, logWarn } from '../../utils/logger';
import type { VideoResult } from '../../types';

export interface FalVideoConfig {
  apiKey: string;
  t2vModel: string;
  i2vModel: string;
  pollIntervalMs: number;
  maxWaitMs: number;
}

const QUEUE_BASE = 'https://queue.fal.run';

export class FalVideoService {
  readonly provider = 'fal';

  constructor(private config: FalVideoConfig) {}

  async textToVideo(prompt: string): Promise<VideoResult> {
    return this.runQueue(this.config.t2vModel, { prompt: prompt.trim() });
  }

  async imageToVideo(prompt: string, imageBase64: string, mimeType: string): Promise<VideoResult> {
    const imageUrl = `data:${mimeType};base64,${imageBase64}`;
    return this.runQueue(this.config.i2vModel, {
      prompt: prompt.trim(),
      image_url: imageUrl,
    });
  }

  private async runQueue(modelId: string, input: Record<string, unknown>): Promise<VideoResult> {
    const submitUrl = `${QUEUE_BASE}/${modelId}`;

    try {
      logInfo('fal.ai video submit', { model: modelId, prompt: String(input.prompt || '').slice(0, 80) });

      const submitRes = await fetch(submitUrl, {
        method: 'POST',
        headers: {
          Authorization: `Key ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      const submitText = await submitRes.text();
      let submitBody: Record<string, unknown>;
      try {
        submitBody = JSON.parse(submitText) as Record<string, unknown>;
      } catch {
        logError('fal.ai invalid JSON on submit', { status: submitRes.status, body: submitText.slice(0, 300) });
        return { success: false, error: `fal_api_error_${submitRes.status}` };
      }

      if (submitRes.status === 401 || submitRes.status === 403) {
        return { success: false, error: 'fal_auth_error' };
      }
      if (submitRes.status === 429) {
        return { success: false, error: 'fal_rate_limit' };
      }
      if (!submitRes.ok) {
        const detail = extractFalError(submitBody);
        logWarn('fal.ai submit rejected', { status: submitRes.status, detail });
        return { success: false, error: detail || `fal_api_error_${submitRes.status}` };
      }

      const requestId = submitBody.request_id as string | undefined;
      if (!requestId) {
        const directUrl = extractVideoUrl(submitBody);
        if (directUrl) return { success: true, mode: 'video', videoUrl: directUrl };
        return { success: false, error: 'fal_no_request_id' };
      }

      const statusUrl =
        (submitBody.status_url as string) ||
        `${QUEUE_BASE}/${modelId}/requests/${requestId}/status`;
      const responseUrl =
        (submitBody.response_url as string) ||
        `${QUEUE_BASE}/${modelId}/requests/${requestId}`;

      return await this.pollUntilDone(statusUrl, responseUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logError('fal.ai video request failed', { message });
      return { success: false, error: message };
    }
  }

  private async pollUntilDone(statusUrl: string, responseUrl: string): Promise<VideoResult> {
    const started = Date.now();

    while (Date.now() - started < this.config.maxWaitMs) {
      const statusRes = await fetch(statusUrl, {
        headers: { Authorization: `Key ${this.config.apiKey}` },
      });

      const statusText = await statusRes.text();
      let statusBody: Record<string, unknown>;
      try {
        statusBody = JSON.parse(statusText) as Record<string, unknown>;
      } catch {
        logWarn('fal.ai invalid status JSON', { body: statusText.slice(0, 200) });
        await sleep(this.config.pollIntervalMs);
        continue;
      }

      const status = statusBody.status as string | undefined;

      if (status === 'COMPLETED') {
        if (statusBody.error) {
          return {
            success: false,
            error: (statusBody.error_type as string) || 'fal_generation_failed',
          };
        }

        const resultRes = await fetch(responseUrl, {
          headers: { Authorization: `Key ${this.config.apiKey}` },
        });

        const resultText = await resultRes.text();
        let resultBody: Record<string, unknown>;
        try {
          resultBody = JSON.parse(resultText) as Record<string, unknown>;
        } catch {
          logError('fal.ai invalid result JSON', { body: resultText.slice(0, 300) });
          return { success: false, error: 'fal_no_video' };
        }

        const videoUrl = extractVideoUrl(resultBody);
        if (!videoUrl) {
          logWarn('fal.ai completed without video URL', { result: resultBody });
          return { success: false, error: 'fal_no_video' };
        }

        logInfo('fal.ai video ready', { url: videoUrl.slice(0, 80) });
        return { success: true, mode: 'video', videoUrl };
      }

      if (status === 'FAILED' || status === 'CANCELLED') {
        return {
          success: false,
          error: (statusBody.error_type as string) || 'fal_generation_failed',
        };
      }

      await sleep(this.config.pollIntervalMs);
    }

    return { success: false, error: 'video_timeout' };
  }
}

function extractVideoUrl(body: Record<string, unknown>): string | undefined {
  const video = body.video as Record<string, unknown> | undefined;
  if (video?.url && typeof video.url === 'string') return video.url;
  if (typeof body.video_url === 'string') return body.video_url;
  return undefined;
}

function extractFalError(body: Record<string, unknown>): string | undefined {
  if (typeof body.detail === 'string') return body.detail;
  if (Array.isArray(body.detail)) {
    const first = body.detail[0] as Record<string, unknown> | undefined;
    if (first?.msg && typeof first.msg === 'string') return first.msg;
  }
  if (typeof body.message === 'string') return body.message;
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createFalVideoServiceFromEnv(): FalVideoService | null {
  const apiKey = process.env.FAL_KEY?.trim() || process.env.FAL_API_KEY?.trim();
  if (!apiKey) return null;

  const pollIntervalMs = parseInt(process.env.FAL_VIDEO_POLL_INTERVAL_MS || '5000', 10);
  const maxWaitMs = parseInt(process.env.FAL_VIDEO_MAX_WAIT_MS || '600000', 10);
  const t2vModel =
    process.env.FAL_T2V_MODEL?.trim() || 'fal-ai/wan/v2.2-a14b/text-to-video';
  const i2vModel =
    process.env.FAL_I2V_MODEL?.trim() || 'fal-ai/wan/v2.2-a14b/image-to-video/turbo';

  return new FalVideoService({ apiKey, t2vModel, i2vModel, pollIntervalMs, maxWaitMs });
}
