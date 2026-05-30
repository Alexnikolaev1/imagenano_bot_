// Video: Cloudflare GIF (free default), ModelScope mp4 (optional), DashScope (paid opt-in)

import type { ImageService } from './imageService';
import type { VideoResult } from '../types';
import { CloudflareGifVideoService } from './providers/cloudflareGifVideo';
import { CloudflarePreviewVideoService } from './providers/cloudflarePreviewVideo';
import { DashScopeVideoService } from './providers/dashScopeVideo';
import { ModelScopeVideoService } from './providers/modelScopeVideo';

export type VideoProvider = 'cloudflare_gif' | 'cloudflare_preview' | 'modelscope' | 'dashscope';

export interface VideoServiceConfig {
  provider: VideoProvider;
  fallbackGif?: CloudflareGifVideoService;
  dashscope?: {
    apiKey: string;
    baseUrl: string;
    t2vModel: string;
    i2vModel: string;
  };
  modelscope?: {
    apiToken: string;
    apiBase: string;
    t2vModel: string;
    i2vModel: string;
    t2vModels?: string[];
    i2vModels?: string[];
  };
  cloudflareGif?: CloudflareGifVideoService;
  cloudflarePreview?: CloudflarePreviewVideoService;
  pollIntervalMs: number;
  maxWaitMs: number;
}

export class VideoService {
  private dashscope?: DashScopeVideoService;
  private modelscope?: ModelScopeVideoService;
  private cloudflareGif?: CloudflareGifVideoService;
  private cloudflarePreview?: CloudflarePreviewVideoService;
  private fallbackGif?: CloudflareGifVideoService;
  readonly provider: VideoProvider;

  constructor(config: VideoServiceConfig) {
    this.provider = config.provider;
    this.fallbackGif = config.fallbackGif;
    if (config.dashscope) {
      this.dashscope = new DashScopeVideoService({
        ...config.dashscope,
        pollIntervalMs: config.pollIntervalMs,
        maxWaitMs: config.maxWaitMs,
      });
    }
    if (config.modelscope) {
      this.modelscope = new ModelScopeVideoService({
        ...config.modelscope,
        pollIntervalMs: config.pollIntervalMs,
        maxWaitMs: config.maxWaitMs,
      });
    }
    if (config.cloudflareGif) this.cloudflareGif = config.cloudflareGif;
    if (config.cloudflarePreview) this.cloudflarePreview = config.cloudflarePreview;
  }

  async textToVideo(prompt: string): Promise<VideoResult> {
    const result = await this.runPrimary('text', prompt);
    return this.withGifFallback(result, () => this.fallbackGif!.textToVideo(prompt));
  }

  async imageToVideo(prompt: string, imageBase64: string, mimeType: string): Promise<VideoResult> {
    const result = await this.runPrimary('image', prompt, imageBase64, mimeType);
    return this.withGifFallback(result, () =>
      this.fallbackGif!.imageToVideo(prompt, imageBase64, mimeType)
    );
  }

  private async runPrimary(
    kind: 'text' | 'image',
    prompt: string,
    imageBase64?: string,
    mimeType?: string
  ): Promise<VideoResult> {
    if (this.provider === 'cloudflare_gif' && this.cloudflareGif) {
      return kind === 'text'
        ? this.cloudflareGif.textToVideo(prompt)
        : this.cloudflareGif.imageToVideo(prompt, imageBase64!, mimeType!);
    }
    if (this.provider === 'cloudflare_preview' && this.cloudflarePreview) {
      return kind === 'text'
        ? this.cloudflarePreview.textToVideo(prompt)
        : this.cloudflarePreview.imageToVideo(prompt, imageBase64!, mimeType!);
    }
    if (this.provider === 'dashscope' && this.dashscope) {
      return kind === 'text'
        ? this.dashscope.textToVideo(prompt)
        : this.dashscope.imageToVideo(prompt, imageBase64!, mimeType!);
    }
    if (this.modelscope) {
      return kind === 'text'
        ? this.modelscope.textToVideo(prompt)
        : this.modelscope.imageToVideo(prompt, imageBase64!, mimeType!);
    }
    return { success: false, error: 'video_not_configured' };
  }

  private async withGifFallback(
    result: VideoResult,
    fallback: () => Promise<VideoResult>
  ): Promise<VideoResult> {
    if (result.success || !this.fallbackGif) return result;
    const retryable = new Set([
      'modelscope_daily_limit',
      'modelscope_no_video_model',
      'modelscope_alibaba_bind_required',
      'modelscope_auth_error',
      'video_timeout',
    ]);
    if (!result.error || !retryable.has(result.error)) return result;
    return fallback();
  }
}

function resolveProvider(): VideoProvider | null {
  const explicit = process.env.VIDEO_PROVIDER?.trim().toLowerCase();
  if (
    explicit === 'dashscope' ||
    explicit === 'modelscope' ||
    explicit === 'cloudflare_gif' ||
    explicit === 'cloudflare_preview'
  ) {
    return explicit;
  }
  if (explicit === 'none' || explicit === 'off') return null;

  // Free default: Cloudflare GIF — works with only CLOUDFLARE_* keys
  return 'cloudflare_gif';
}

export function createVideoServiceFromEnv(imageService?: ImageService): VideoService | null {
  const provider = resolveProvider();
  if (!provider) return null;

  const pollIntervalMs = parseInt(process.env.VIDEO_POLL_INTERVAL_MS || '5000', 10);
  const maxWaitMs = parseInt(process.env.VIDEO_MAX_WAIT_MS || '280000', 10);
  const gifDelayMs = parseInt(process.env.VIDEO_GIF_FRAME_DELAY_MS || '900', 10);

  const t2vDash = process.env.WAN_T2V_MODEL || 'wan2.1-t2v-turbo';
  const i2vDash = process.env.WAN_I2V_MODEL || 'wan2.1-i2v-plus';
  const t2vMs =
    process.env.MODELSCOPE_T2V_MODEL ||
    'Wan-AI/Wan2.2-T2V-A14B-Diffusers,Wan-AI/Wan2.1-T2V-1.3B-Diffusers';
  const i2vMs =
    process.env.MODELSCOPE_I2V_MODEL ||
    'Wan-AI/Wan2.2-I2V-A14B-Diffusers,Wan-AI/Wan2.1-I2V-14B-720P';

  const dashBase =
    process.env.DASHSCOPE_BASE_URL?.replace(/\/$/, '') ||
    'https://dashscope.aliyuncs.com/api/v1';
  const msBase =
    process.env.MODELSCOPE_API_BASE?.replace(/\/$/, '') ||
    'https://api-inference.modelscope.cn/v1';

  const needsImageService =
    provider === 'cloudflare_gif' ||
    provider === 'cloudflare_preview' ||
    provider === 'modelscope';
  if (needsImageService && !imageService) return null;

  const gifService = imageService
    ? new CloudflareGifVideoService(imageService, gifDelayMs)
    : undefined;
  const fallbackGif =
    gifService && process.env.VIDEO_FALLBACK !== 'false' ? gifService : undefined;

  if (provider === 'cloudflare_gif') {
    return new VideoService({
      provider: 'cloudflare_gif',
      cloudflareGif: gifService!,
      pollIntervalMs,
      maxWaitMs,
    });
  }

  if (provider === 'cloudflare_preview') {
    return new VideoService({
      provider: 'cloudflare_preview',
      cloudflarePreview: new CloudflarePreviewVideoService(imageService!),
      pollIntervalMs,
      maxWaitMs,
    });
  }

  if (provider === 'dashscope') {
    const apiKey = process.env.DASHSCOPE_API_KEY?.trim();
    if (!apiKey) return null;
    return new VideoService({
      provider: 'dashscope',
      dashscope: { apiKey, baseUrl: dashBase, t2vModel: t2vDash, i2vModel: i2vDash },
      pollIntervalMs,
      maxWaitMs,
    });
  }

  const modelscopeToken = process.env.MODELSCOPE_API_TOKEN?.trim();
  if (!modelscopeToken) return null;

  const t2vList = t2vMs.split(',').map((s) => s.trim()).filter(Boolean);
  const i2vList = i2vMs.split(',').map((s) => s.trim()).filter(Boolean);

  return new VideoService({
    provider: 'modelscope',
    modelscope: {
      apiToken: modelscopeToken,
      apiBase: msBase,
      t2vModel: t2vList[0] || 'Wan-AI/Wan2.2-T2V-A14B-Diffusers',
      i2vModel: i2vList[0] || 'Wan-AI/Wan2.2-I2V-A14B-Diffusers',
      t2vModels: t2vList,
      i2vModels: i2vList,
    },
    fallbackGif,
    pollIntervalMs,
    maxWaitMs,
  });
}
