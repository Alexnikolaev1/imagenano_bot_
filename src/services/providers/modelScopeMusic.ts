// ModelScope Inference API — MusicGen-Small (text-to-music)
// Uses the same async pattern as images: POST /v1/images/generations
// Model page: https://www.modelscope.cn/models/AI-ModelScope/musicgen-small

import { logError, logInfo, logWarn } from '../../utils/logger';
import { extractModelScopeMessage, normalizeModelScopeError } from '../../utils/modelScopeErrors';
import type { MusicResult } from '../../types';

export interface ModelScopeMusicConfig {
  apiToken: string;
  apiBase: string;
  model: string;
  /** Optional fallbacks when primary model id is rejected */
  models?: string[];
  pollIntervalMs: number;
  maxWaitMs: number;
}

const TASK_TYPES = [
  'audio_generation',
  'music_generation',
  'text_to_audio',
  'image_generation',
] as const;

export class ModelScopeMusicService {
  constructor(private config: ModelScopeMusicConfig) {}

  async textToMusic(prompt: string): Promise<MusicResult> {
    const models = uniqueModels(this.config.models, this.config.model);
    let lastError = 'modelscope_no_music_model';

    for (const model of models) {
      const result = await this.submitAndPoll({ model, prompt: prompt.slice(0, 1024) });
      if (result.success) return result;
      if (result.error && result.error !== 'modelscope_no_music_model') {
        return result;
      }
      lastError = result.error || lastError;
      logWarn('ModelScope music model rejected, trying next', { model });
    }

    return { success: false, error: lastError };
  }

  private async submitAndPoll(payload: Record<string, string>): Promise<MusicResult> {
    const base = this.config.apiBase.replace(/\/$/, '');
    const submitUrl = `${base}/images/generations`;

    try {
      logInfo('ModelScope music submit', { model: payload.model });

      const submitRes = await fetch(submitUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json',
          'X-ModelScope-Async-Mode': 'true',
        },
        body: JSON.stringify(payload),
      });

      const contentType = submitRes.headers.get('content-type') || '';
      if (contentType.includes('audio/')) {
        const buffer = Buffer.from(await submitRes.arrayBuffer());
        if (buffer.length > 0) {
          return {
            success: true,
            audioBase64: buffer.toString('base64'),
            mimeType: contentType.split(';')[0] || 'audio/wav',
          };
        }
      }

      const submitText = await submitRes.text();
      let submitBody: Record<string, unknown>;
      try {
        submitBody = JSON.parse(submitText) as Record<string, unknown>;
      } catch {
        logError('ModelScope music invalid JSON', {
          status: submitRes.status,
          body: submitText.slice(0, 300),
        });
        return { success: false, error: `ModelScope API error ${submitRes.status}` };
      }

      if (submitRes.status === 429) {
        return { success: false, error: 'modelscope_daily_limit' };
      }

      if (!submitRes.ok) {
        const msg = extractModelScopeMessage(submitBody);
        logWarn('ModelScope music submit rejected', { status: submitRes.status, body: submitBody });
        if (submitRes.status === 404) {
          return { success: false, error: 'modelscope_no_music_model' };
        }
        return {
          success: false,
          error: normalizeModelScopeError(msg, submitRes.status),
        };
      }

      const direct = extractAudioFromBody(submitBody);
      if (direct) return { success: true, ...direct };

      const taskId =
        (submitBody.task_id as string) ||
        ((submitBody.output as Record<string, unknown>)?.task_id as string);
      if (!taskId) {
        return { success: false, error: 'modelscope_no_music_model' };
      }

      return await this.pollTask(base, taskId);
    } catch (err) {
      if (err instanceof MusicRateLimitError) {
        return { success: false, error: 'modelscope_daily_limit' };
      }
      const message = err instanceof Error ? err.message : String(err);
      logError('ModelScope music request failed', { message });
      return { success: false, error: message };
    }
  }

  private async pollTask(apiBase: string, taskId: string): Promise<MusicResult> {
    const taskUrl = `${apiBase}/tasks/${taskId}`;
    const started = Date.now();
    let activeTaskType: string = TASK_TYPES[0];

    try {
      while (Date.now() - started < this.config.maxWaitMs) {
        await sleep(this.config.pollIntervalMs);

        const body = await this.fetchTask(taskUrl, activeTaskType);
        if (!body) {
          for (const taskType of TASK_TYPES) {
            if (taskType === activeTaskType) continue;
            const alt = await this.fetchTask(taskUrl, taskType);
            if (alt) {
              activeTaskType = taskType;
              const altStatus = normalizeStatus(alt);
              logInfo('ModelScope music poll (switched task type)', {
                taskId,
                taskType: activeTaskType,
                status: altStatus,
              });
              if (isSuccessStatus(altStatus)) {
                const audio = extractAudioFromBody(alt);
                if (!audio) return { success: false, error: 'audio missing in ModelScope result' };
                return { success: true, ...audio };
              }
              if (isFailureStatus(altStatus)) {
                return {
                  success: false,
                  error: (alt.message as string) || (alt.error as string) || `Task ${altStatus}`,
                };
              }
              break;
            }
          }
          continue;
        }

        const status = normalizeStatus(body);
        logInfo('ModelScope music poll', { taskId, taskType: activeTaskType, status });

        if (isSuccessStatus(status)) {
          const audio = extractAudioFromBody(body);
          if (!audio) return { success: false, error: 'audio missing in ModelScope result' };
          return { success: true, ...audio };
        }

        if (isFailureStatus(status)) {
          return {
            success: false,
            error: (body.message as string) || (body.error as string) || `Task ${status}`,
          };
        }
      }

      return { success: false, error: 'music_timeout' };
    } catch (err) {
      if (err instanceof MusicRateLimitError) {
        return { success: false, error: 'modelscope_daily_limit' };
      }
      throw err;
    }
  }

  private async fetchTask(
    taskUrl: string,
    taskType: string
  ): Promise<Record<string, unknown> | null> {
    const res = await fetch(taskUrl, {
      headers: {
        Authorization: `Bearer ${this.config.apiToken}`,
        'X-ModelScope-Task-Type': taskType,
      },
    });

    if (res.status === 429) {
      throw new MusicRateLimitError();
    }
    if (res.status === 404) return null;

    try {
      return (await res.json()) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

class MusicRateLimitError extends Error {
  constructor() {
    super('modelscope_daily_limit');
    this.name = 'MusicRateLimitError';
  }
}

function normalizeStatus(body: Record<string, unknown>): string {
  const output = body.output as Record<string, unknown> | undefined;
  return String(
    body.task_status || output?.task_status || body.status || ''
  ).toUpperCase();
}

function isSuccessStatus(status: string): boolean {
  return status === 'SUCCEEDED' || status === 'SUCCEED' || status === 'COMPLETED';
}

function isFailureStatus(status: string): boolean {
  return status === 'FAILED' || status === 'CANCELED' || status === 'CANCELLED';
}

function extractAudioFromBody(
  body: Record<string, unknown>
): { audioUrl?: string; audioBase64?: string; mimeType?: string } | undefined {
  const output = body.output as Record<string, unknown> | undefined;

  const urlCandidates = [
    output?.audio_url,
    body.audio_url,
    output?.output_audio,
    pickFirstUrl(output?.output_audios),
    pickFirstUrl(body.output_audios),
    pickFirstUrl(output?.audios),
    pickFirstUrl(body.audios),
    (body.result as Record<string, unknown> | undefined)?.audio_url,
  ];
  for (const candidate of urlCandidates) {
    if (typeof candidate === 'string' && candidate.startsWith('http')) {
      return { audioUrl: candidate, mimeType: guessMimeFromUrl(candidate) };
    }
  }

  const b64Candidates = [
    output?.audio,
    body.audio,
    output?.b64_audio,
    body.b64_audio,
    pickFirstB64(output?.output_audios),
    pickFirstB64(body.output_audios),
    pickFirstDataItem(body),
  ];
  for (const candidate of b64Candidates) {
    if (typeof candidate === 'string' && candidate.length > 100) {
      return { audioBase64: candidate, mimeType: 'audio/wav' };
    }
  }

  return undefined;
}

function pickFirstUrl(value: unknown): string | undefined {
  if (typeof value === 'string' && value.startsWith('http')) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && item.startsWith('http')) return item;
      if (item && typeof item === 'object') {
        const url = (item as { url?: string }).url;
        if (url?.startsWith('http')) return url;
      }
    }
  }
  return undefined;
}

function pickFirstB64(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const b64 = (item as { b64?: string; b64_json?: string }).b64 ||
          (item as { b64_json?: string }).b64_json;
        if (b64) return b64;
      }
    }
  }
  return undefined;
}

function pickFirstDataItem(body: Record<string, unknown>): string | undefined {
  const data = body.data as Array<{ b64_json?: string; url?: string }> | undefined;
  if (!data?.[0]) return undefined;
  return data[0].b64_json;
}

function guessMimeFromUrl(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('.mp3')) return 'audio/mpeg';
  if (lower.includes('.ogg')) return 'audio/ogg';
  return 'audio/wav';
}

function uniqueModels(list: string[] | undefined, primary: string): string[] {
  const all = [...(list || []), primary].map((m) => m.trim()).filter(Boolean);
  return [...new Set(all)];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
