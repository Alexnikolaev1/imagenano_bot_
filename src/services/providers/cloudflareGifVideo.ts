// Free short looping GIF via Cloudflare Flux (~2 frames, ~160 neurons total).
// Best free daily option for a Vercel bot — real motion, no paid video API.

import type { ImageService } from '../imageService';
import type { VideoResult } from '../../types';
import { encodeGifFromBase64Frames } from '../../utils/gifEncode';
import { resizeForCloudflareInput } from '../../utils/imageResize';
import { logInfo, logWarn } from '../../utils/logger';

const SCENE_PREFIX = 'Cinematic 16:9 widescreen film still: ';
const MOTION_SUFFIX = ', same scene a moment later with subtle natural movement';

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
      logWarn('Cloudflare GIF: second frame failed, looping first frame', {
        error: frame2.error,
      });
      return this.toGifResult([frame1.imageData, frame1.imageData]);
    }

    return this.toGifResult([frame1.imageData, frame2.imageData]);
  }

  async imageToVideo(prompt: string, imageBase64: string, mimeType: string): Promise<VideoResult> {
    logInfo('Cloudflare GIF: image-to-video', { prompt: prompt.slice(0, 80) });
    const motion = prompt.trim() || 'gentle natural motion';

    let frame1B64: string;
    try {
      const frame1Buffer = await resizeForCloudflareInput(imageBase64);
      frame1B64 = frame1Buffer.toString('base64');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }

    const frame2 = await this.imageService.editImage(imageBase64, mimeType, motion);
    if (!frame2.success || !frame2.imageData) {
      logWarn('Cloudflare GIF: photo edit failed, falling back to text frames', {
        error: frame2.error,
      });
      return this.textToVideo(`${motion}, cinematic scene`);
    }

    return this.toGifResult([frame1B64, frame2.imageData]);
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
