// Music: Hugging Face MusicGen (default) or ModelScope (optional, needs China Aliyun bind)

import type { MusicResult } from '../types';
import { HuggingFaceMusicService } from './providers/huggingFaceMusic';
import { ModelScopeMusicService } from './providers/modelScopeMusic';

export type MusicProvider = 'huggingface' | 'modelscope';

export interface MusicServiceConfig {
  provider: MusicProvider;
  huggingface?: {
    apiToken: string;
    model: string;
    maxRetries: number;
    retryDelayMs: number;
    requestTimeoutMs: number;
  };
  modelscope?: {
    apiToken: string;
    apiBase: string;
    model: string;
    models?: string[];
    pollIntervalMs: number;
    maxWaitMs: number;
  };
}

export class MusicService {
  private huggingface?: HuggingFaceMusicService;
  private modelscope?: ModelScopeMusicService;
  readonly provider: MusicProvider;

  constructor(config: MusicServiceConfig) {
    this.provider = config.provider;
    if (config.huggingface) {
      this.huggingface = new HuggingFaceMusicService(config.huggingface);
    }
    if (config.modelscope) {
      this.modelscope = new ModelScopeMusicService(config.modelscope);
    }
  }

  async textToMusic(prompt: string): Promise<MusicResult> {
    if (this.provider === 'huggingface' && this.huggingface) {
      const result = await this.huggingface.textToMusic(prompt);
      if (result.success || !this.modelscope) return result;
      return this.modelscope.textToMusic(prompt);
    }
    if (this.modelscope) {
      return this.modelscope.textToMusic(prompt);
    }
    return { success: false, error: 'music_not_configured' };
  }
}

function resolveMusicProvider(): MusicProvider | null {
  const explicit = process.env.MUSIC_PROVIDER?.trim().toLowerCase();
  if (explicit === 'huggingface' || explicit === 'hf') return 'huggingface';
  if (explicit === 'modelscope') return 'modelscope';
  if (explicit === 'none' || explicit === 'off') return null;

  const hfToken =
    process.env.HUGGINGFACE_TOKEN?.trim() || process.env.HF_TOKEN?.trim();
  if (hfToken) return 'huggingface';

  if (process.env.MODELSCOPE_API_TOKEN?.trim()) return 'modelscope';

  return null;
}

export function createMusicServiceFromEnv(): MusicService | null {
  if (process.env.MUSIC_ENABLED === 'false') return null;

  const provider = resolveMusicProvider();
  if (!provider) return null;

  const hfToken =
    process.env.HUGGINGFACE_TOKEN?.trim() || process.env.HF_TOKEN?.trim();
  const msToken = process.env.MODELSCOPE_API_TOKEN?.trim();

  const hfModel =
    process.env.HUGGINGFACE_MUSIC_MODEL?.trim() || 'facebook/musicgen-small';
  const hfMaxRetries = parseInt(process.env.HF_MUSIC_MAX_RETRIES || '4', 10);
  const hfRetryDelayMs = parseInt(process.env.HF_MUSIC_RETRY_DELAY_MS || '15000', 10);
  const hfTimeoutMs = parseInt(process.env.HF_MUSIC_TIMEOUT_MS || '120000', 10);

  const modelList =
    process.env.MODELSCOPE_MUSIC_MODEL ||
    'AI-ModelScope/musicgen-small,facebook/musicgen-small';
  const msModels = modelList.split(',').map((s) => s.trim()).filter(Boolean);
  const msBase =
    process.env.MODELSCOPE_API_BASE?.replace(/\/$/, '') ||
    'https://api-inference.modelscope.cn/v1';
  const pollIntervalMs = parseInt(process.env.MUSIC_POLL_INTERVAL_MS || '3000', 10);
  const maxWaitMs = parseInt(process.env.MUSIC_MAX_WAIT_MS || '120000', 10);

  if (provider === 'huggingface') {
    if (!hfToken) return null;
    return new MusicService({
      provider: 'huggingface',
      huggingface: {
        apiToken: hfToken,
        model: hfModel,
        maxRetries: hfMaxRetries,
        retryDelayMs: hfRetryDelayMs,
        requestTimeoutMs: hfTimeoutMs,
      },
      modelscope: msToken
        ? {
            apiToken: msToken,
            apiBase: msBase,
            model: msModels[0] || 'AI-ModelScope/musicgen-small',
            models: msModels,
            pollIntervalMs,
            maxWaitMs,
          }
        : undefined,
    });
  }

  if (!msToken) return null;
  return new MusicService({
    provider: 'modelscope',
    modelscope: {
      apiToken: msToken,
      apiBase: msBase,
      model: msModels[0] || 'AI-ModelScope/musicgen-small',
      models: msModels,
      pollIntervalMs,
      maxWaitMs,
    },
  });
}
