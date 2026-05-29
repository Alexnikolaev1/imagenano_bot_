// DashScope Wan 2.1 API — async text/image-to-video
// Docs: https://www.alibabacloud.com/help/en/model-studio/image-to-video-api-reference

import { logError, logInfo } from '../../utils/logger';
import type { VideoResult } from '../../types';

export interface DashScopeVideoConfig {
  apiKey: string;
  baseUrl: string;
  t2vModel: string;
  i2vModel: string;
  pollIntervalMs: number;
  maxWaitMs: number;
}

interface TaskOutput {
  task_status?: string;
  video_url?: string;
  message?: string;
  code?: string;
}

interface SubmitResponse {
  output?: { task_id?: string; task_status?: string; video_url?: string };
  code?: string;
  message?: string;
}

export class DashScopeVideoService {
  constructor(private config: DashScopeVideoConfig) {}

  async textToVideo(prompt: string): Promise<VideoResult> {
    return this.runTask(this.config.t2vModel, { prompt }, { size: '1280*720', prompt_extend: true });
  }

  async imageToVideo(prompt: string, imageBase64: string, mimeType: string): Promise<VideoResult> {
    const imgUrl = toDataUri(imageBase64, mimeType);
    return this.runTask(
      this.config.i2vModel,
      { prompt, img_url: imgUrl },
      { resolution: '720P', prompt_extend: true }
    );
  }

  private async runTask(
    model: string,
    input: Record<string, string>,
    parameters: Record<string, unknown>
  ): Promise<VideoResult> {
    const submitUrl = `${this.config.baseUrl}/services/aigc/video-generation/video-synthesis`;

    try {
      logInfo('DashScope video submit', { model, prompt: input.prompt?.slice(0, 80) });

      const submitRes = await fetch(submitUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify({ model, input, parameters }),
      });

      const submitBody = (await submitRes.json()) as SubmitResponse;

      if (!submitRes.ok) {
        const msg = submitBody.message || `HTTP ${submitRes.status}`;
        logError('DashScope video submit failed', { status: submitRes.status, body: submitBody });
        return { success: false, error: msg };
      }

      if (submitBody.output?.video_url) {
        return { success: true, videoUrl: submitBody.output.video_url };
      }

      const taskId = submitBody.output?.task_id;
      if (!taskId) {
        return { success: false, error: submitBody.message || 'No task_id in DashScope response' };
      }

      return await this.pollTask(taskId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logError('DashScope video request failed', { message });
      return { success: false, error: message };
    }
  }

  private async pollTask(taskId: string): Promise<VideoResult> {
    const taskUrl = `${this.config.baseUrl}/tasks/${taskId}`;
    const started = Date.now();

    while (Date.now() - started < this.config.maxWaitMs) {
      await sleep(this.config.pollIntervalMs);

      const res = await fetch(taskUrl, {
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
      });
      const body = (await res.json()) as { output?: TaskOutput; message?: string; code?: string };

      const status = body.output?.task_status;
      logInfo('DashScope video poll', { taskId, status });

      if (status === 'SUCCEEDED') {
        const url = body.output?.video_url;
        if (!url) return { success: false, error: 'video_url missing in succeeded task' };
        return { success: true, videoUrl: url };
      }

      if (status === 'FAILED' || status === 'CANCELED') {
        return {
          success: false,
          error: body.output?.message || body.message || `Task ${status}`,
        };
      }
    }

    return { success: false, error: 'video_timeout' };
  }
}

function toDataUri(base64: string, mimeType: string): string {
  const trimmed = base64.trim();
  if (trimmed.startsWith('data:')) return trimmed;
  return `data:${mimeType || 'image/jpeg'};base64,${trimmed}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
