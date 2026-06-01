// Colab/ngrok video — image-to-video; text prompts get a Cloudflare still first

import type { ImageService } from './imageService';
import type { VideoGenerator } from './videoGenerator';
import { ColabVideoApiClient, createColabVideoApiFromEnv } from './providers/colabVideoApi';
import type { VideoResult } from '../types';
import { logInfo } from '../utils/logger';

const SCENE_PREFIX = 'Cinematic 16:9 widescreen film still: ';

export class ColabVideoService implements VideoGenerator {
  readonly provider = 'colab';

  constructor(
    private api: ColabVideoApiClient,
    private imageService: ImageService
  ) {}

  async textToVideo(prompt: string): Promise<VideoResult> {
    logInfo('Colab video: generating keyframe from text', { prompt: prompt.slice(0, 80) });
    const frame = await this.imageService.generateImage(`${SCENE_PREFIX}${prompt.trim()}`);
    if (!frame.success || !frame.imageData) {
      return { success: false, error: frame.error || 'colab_image_failed' };
    }
    return this.imageToVideo(prompt, frame.imageData, frame.mimeType || 'image/png');
  }

  async imageToVideo(prompt: string, imageBase64: string, mimeType: string): Promise<VideoResult> {
    const buffer = Buffer.from(imageBase64, 'base64');
    if (buffer.length === 0) return { success: false, error: 'colab_bad_request' };
    return this.api.generateFromImage(buffer, mimeType, prompt);
  }
}

export function createColabVideoServiceFromEnv(imageService: ImageService): ColabVideoService | null {
  const api = createColabVideoApiFromEnv();
  if (!api) return null;
  return new ColabVideoService(api, imageService);
}
