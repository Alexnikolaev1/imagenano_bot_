// Free short looping GIF via Cloudflare Flux (~2 frames, ~160 neurons total).
// Best free daily option for a Vercel bot — real motion, no paid video API.

import type { ImageService } from '../imageService';
import type { VideoResult } from '../../types';
import { encodeGifFromBase64Frames } from '../../utils/gifEncode';
import { logInfo } from '../../utils/logger';

const SCENE_PREFIX = 'Cinematic 16:9 widescreen video frame, film still: ';
const MOTION_SUFFIX = ', same scene one moment later with subtle natural motion, next video frame';

export class CloudflareGifVideoService {
  constructor(
    private imageService: ImageService,
    private frameDelayMs = 900
  ) {}

  async textToVideo(prompt: string): Promise<VideoResult> {
    logInfo('Cloudflare GIF: text-to-video', { prompt: prompt.slice(0, 80) });
    const scene = prompt.trim();
    const frame1 = await this.imageService.generateImage(`${SCENE_PREFIX}${scene}`);
    if (!frame1.success || !frame1.imageData) {
      return { success: false, error: frame1.error || 'gif_failed' };
    }

    const frame2 = await this.imageService.generateImage(
      `${SCENE_PREFIX}${scene}${MOTION_SUFFIX}`
    );
    if (!frame2.success || !frame2.imageData) {
      return { success: false, error: frame2.error || 'gif_failed' };
    }

    return this.toGifResult([frame1.imageData, frame2.imageData]);
  }

  async imageToVideo(prompt: string, imageBase64: string, mimeType: string): Promise<VideoResult> {
    logInfo('Cloudflare GIF: image-to-video', { prompt: prompt.slice(0, 80) });
    const motion = prompt.trim() || 'gentle natural motion';
    const frame1 = await this.imageService.editImage(imageBase64, mimeType, motion);
    if (!frame1.success || !frame1.imageData) {
      return { success: false, error: frame1.error || 'gif_failed' };
    }

    const frame2 = await this.imageService.editImage(
      frame1.imageData,
      frame1.mimeType || 'image/jpeg',
      `${motion}${MOTION_SUFFIX}`
    );
    if (!frame2.success || !frame2.imageData) {
      return { success: false, error: frame2.error || 'gif_failed' };
    }

    return this.toGifResult([frame1.imageData, frame2.imageData]);
  }

  private async toGifResult(frames: string[]): Promise<VideoResult> {
    try {
      const gif = await encodeGifFromBase64Frames(frames, this.frameDelayMs);
      return {
        success: true,
        mode: 'gif',
        imageBase64: gif.toString('base64'),
        mimeType: 'image/gif',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }
}
