// ModelScope Inference API — async video (models must have "API-Inference" badge on modelscope.cn)
// Free tier: ~2000 API calls/day per account (resets 00:00 UTC+8), shared across all models.
// Docs pattern mirrors image API: https://api-inference.modelscope.cn/v1/images/generations

import { logError, logInfo, logWarn } from '../../utils/logger';
import { extractModelScopeMessage, normalizeModelScopeError } from '../../utils/modelScopeErrors';
import type { VideoResult } from '../../types';

export interface ModelScopeVideoConfig {
  apiToken: string;
  apiBase: string;
  t2vModel: string;
  i2vModel: string;
  /** Optional fallbacks when primary model id is rejected */
  t2vModels?: string[];
  i2vModels?: string[];
  pollIntervalMs: number;
  maxWaitMs: number;
}

export class ModelScopeVideoService {
  constructor(private config: ModelScopeVideoConfig) {}

  async textToVideo(prompt: string): Promise<VideoResult> {
    const models = uniqueModels(this.config.t2vModels, this.config.t2vModel);
    return this.submitWithModelFallback(models, {
      prompt,
      size: '1280x720',
    });
  }

  async imageToVideo(prompt: string, imageBase64: string, mimeType: string): Promise<VideoResult> {
    const models = uniqueModels(this.config.i2vModels, this.config.i2vModel);
    return this.submitWithModelFallback(models, {
      prompt,
      image: toDataUri(imageBase64, mimeType),
    });
  }

  private async submitWithModelFallback(
    models: string[],
    payload: Record<string, string>
  ): Promise<VideoResult> {
    let lastError = 'modelscope_no_video_model';
    for (const model of models) {
      const result = await this.submitAndPoll({ ...payload, model });
      if (result.success) return result;
      if (result.error && result.error !== 'modelscope_no_video_model') {
        return result;
      }
      lastError = result.error || lastError;
      logWarn('ModelScope video model rejected, trying next', { model });
    }
    return { success: false, error: lastError };
  }

  private async submitAndPoll(payload: Record<string, string>): Promise<VideoResult> {
    const base = this.config.apiBase.replace(/\/$/, '');
    const submitUrl = `${base}/videos/generations`;

    try {
      logInfo('ModelScope video submit', { model: payload.model });

      const submitRes = await fetch(submitUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json',
          'X-ModelScope-Async-Mode': 'true',
        },
        body: JSON.stringify(payload),
      });

      const submitText = await submitRes.text();
      let submitBody: Record<string, unknown>;
      try {
        submitBody = JSON.parse(submitText) as Record<string, unknown>;
      } catch {
        logError('ModelScope video invalid JSON', { status: submitRes.status, body: submitText.slice(0, 300) });
        return { success: false, error: `ModelScope API error ${submitRes.status}` };
      }

      if (submitRes.status === 429) {
        return { success: false, error: 'modelscope_daily_limit' };
      }

      if (!submitRes.ok) {
        const msg = extractModelScopeMessage(submitBody);
        logWarn('ModelScope video submit rejected', { status: submitRes.status, body: submitBody });
        if (submitRes.status === 404) {
          return { success: false, error: 'modelscope_no_video_model' };
        }
        return {
          success: false,
          error: normalizeModelScopeError(msg, submitRes.status),
        };
      }

      const directUrl = extractVideoUrl(submitBody);
      if (directUrl) return { success: true, mode: 'video', videoUrl: directUrl };

      const taskId =
        (submitBody.task_id as string) ||
        ((submitBody.output as Record<string, unknown>)?.task_id as string);
      if (!taskId) {
        return { success: false, error: 'modelscope_no_video_model' };
      }

      return await this.pollTask(base, taskId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logError('ModelScope video request failed', { message });
      return { success: false, error: message };
    }
  }

  private async pollTask(apiBase: string, taskId: string): Promise<VideoResult> {
    const taskUrl = `${apiBase}/tasks/${taskId}`;
    const started = Date.now();

    while (Date.now() - started < this.config.maxWaitMs) {
      await sleep(this.config.pollIntervalMs);

      const res = await fetch(taskUrl, {
        headers: {
          Authorization: `Bearer ${this.config.apiToken}`,
          'X-ModelScope-Task-Type': 'video_generation',
        },
      });

      if (res.status === 429) {
        return { success: false, error: 'modelscope_daily_limit' };
      }

      const body = (await res.json()) as Record<string, unknown>;
      const status = normalizeStatus(body);

      logInfo('ModelScope video poll', { taskId, status });

      if (isSuccessStatus(status)) {
        const url = extractVideoUrl(body);
        if (!url) return { success: false, error: 'video_url missing in ModelScope result' };
        return { success: true, mode: 'video', videoUrl: url };
      }

      if (isFailureStatus(status)) {
        return {
          success: false,
          error: (body.message as string) || (body.error as string) || `Task ${status}`,
        };
      }
    }

    return { success: false, error: 'video_timeout' };
  }
}

function normalizeStatus(body: Record<string, unknown>): string {
  const output = body.output as Record<string, unknown> | undefined;
  return String(
    body.task_status ||
      output?.task_status ||
      body.task_status ||
      body.status ||
      ''
  ).toUpperCase();
}

function isSuccessStatus(status: string): boolean {
  return status === 'SUCCEEDED' || status === 'SUCCEED' || status === 'COMPLETED';
}

function isFailureStatus(status: string): boolean {
  return status === 'FAILED' || status === 'CANCELED' || status === 'CANCELLED';
}

function extractVideoUrl(body: Record<string, unknown>): string | undefined {
  const output = body.output as Record<string, unknown> | undefined;
  if (typeof output?.video_url === 'string') return output.video_url;
  if (typeof body.video_url === 'string') return body.video_url;

  const outputVideos = output?.output_videos as string[] | undefined;
  if (outputVideos?.[0]) return outputVideos[0];

  const videos = body.videos as Array<{ url?: string }> | undefined;
  if (videos?.[0]?.url) return videos[0].url;

  const result = body.result as Record<string, unknown> | undefined;
  if (typeof result?.video_url === 'string') return result.video_url;

  return undefined;
}

function toDataUri(base64: string, mimeType: string): string {
  const trimmed = base64.trim();
  if (trimmed.startsWith('data:')) return trimmed;
  return `data:${mimeType || 'image/jpeg'};base64,${trimmed}`;
}

function uniqueModels(list: string[] | undefined, primary: string): string[] {
  const all = [...(list || []), primary].map((m) => m.trim()).filter(Boolean);
  return [...new Set(all)];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
