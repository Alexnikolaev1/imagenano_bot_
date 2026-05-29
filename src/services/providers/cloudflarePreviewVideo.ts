// Free "cinematic still" fallback — uses Cloudflare Flux (same daily neuron quota as images).
// Not real motion video, but works without paid APIs.

import type { ImageService } from '../imageService';
import type { VideoResult } from '../../types';
import { logInfo } from '../../utils/logger';

const CINEMATIC_PREFIX =
  'Cinematic widescreen film still, 16:9, shallow depth of field, dramatic lighting, subtle motion blur, single keyframe from a movie scene: ';

export class CloudflarePreviewVideoService {
  constructor(private imageService: ImageService) {}

  async textToVideo(prompt: string): Promise<VideoResult> {
    logInfo('Cloudflare preview: text-to-still', { prompt: prompt.slice(0, 80) });
    return this.generateStill(prompt);
  }

  async imageToVideo(prompt: string, imageBase64: string, mimeType: string): Promise<VideoResult> {
    logInfo('Cloudflare preview: image-to-still', { prompt: prompt.slice(0, 80) });
    const instruction = `Animate this scene as a cinematic film still: ${prompt}`;
    const result = await this.imageService.editImage(imageBase64, mimeType, instruction);
    if (!result.success || !result.imageData) {
      return { success: false, error: result.error || 'preview_failed' };
    }
    return {
      success: true,
      mode: 'preview',
      imageBase64: result.imageData,
      mimeType: result.mimeType || 'image/jpeg',
    };
  }

  private async generateStill(prompt: string): Promise<VideoResult> {
    const result = await this.imageService.generateImage(`${CINEMATIC_PREFIX}${prompt}`);
    if (!result.success || !result.imageData) {
      return { success: false, error: result.error || 'preview_failed' };
    }
    return {
      success: true,
      mode: 'preview',
      imageBase64: result.imageData,
      mimeType: result.mimeType || 'image/jpeg',
    };
  }
}
