// Music generation via ModelScope MusicGen-Small (requires MODELSCOPE_API_TOKEN)

import type { MusicResult } from '../types';
import { ModelScopeMusicService } from './providers/modelScopeMusic';

export interface MusicServiceConfig {
  apiToken: string;
  apiBase: string;
  model: string;
  models?: string[];
  pollIntervalMs: number;
  maxWaitMs: number;
}

export class MusicService {
  private modelscope: ModelScopeMusicService;

  constructor(config: MusicServiceConfig) {
    this.modelscope = new ModelScopeMusicService(config);
  }

  async textToMusic(prompt: string): Promise<MusicResult> {
    return this.modelscope.textToMusic(prompt);
  }
}

export function createMusicServiceFromEnv(): MusicService | null {
  if (process.env.MUSIC_ENABLED === 'false') return null;

  const apiToken = process.env.MODELSCOPE_API_TOKEN?.trim();
  if (!apiToken) return null;

  const modelList =
    process.env.MODELSCOPE_MUSIC_MODEL ||
    'AI-ModelScope/musicgen-small,facebook/musicgen-small';
  const models = modelList.split(',').map((s) => s.trim()).filter(Boolean);

  const apiBase =
    process.env.MODELSCOPE_API_BASE?.replace(/\/$/, '') ||
    'https://api-inference.modelscope.cn/v1';

  const pollIntervalMs = parseInt(process.env.MUSIC_POLL_INTERVAL_MS || '3000', 10);
  const maxWaitMs = parseInt(process.env.MUSIC_MAX_WAIT_MS || '120000', 10);

  return new MusicService({
    apiToken,
    apiBase,
    model: models[0] || 'AI-ModelScope/musicgen-small',
    models,
    pollIntervalMs,
    maxWaitMs,
  });
}
