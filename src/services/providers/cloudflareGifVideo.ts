// Free short looping GIF via Cloudflare Flux (1–2 frames).

import type { ImageService } from '../imageService';
import type { VideoResult } from '../../types';
import { encodeGifFromBase64Frames, encodeStaticGifFromBase64 } from '../../utils/gifEncode';
import { resizeForCloudflareInput } from '../../utils/imageResize';
import { logInfo, logWarn } from '../../utils/logger';

const SCENE_PREFIX = 'Cinematic 16:9 widescreen film still: ';

export class CloudflareGifVideoService {
  constructor(
    private imageService: ImageService,
    private frameDelayMs = 130,
    private crossfadeSteps = 6
  ) {}

  async textToVideo(prompt: string): Promise<VideoResult> {
    logInfo('Cloudflare GIF: text-to-video', { prompt: prompt.slice(0, 80) });
    const scene = prompt.trim();

    const frame1 = await this.imageService.generateImage(`${SCENE_PREFIX}${scene}`);
    if (!frame1.success || !frame1.imageData) {
      return { success: false, error: frame1.error || 'gif_failed' };
    }

    // One Cloudflare call is enough for a looping clip; optional 2nd frame for motion.
    const frame2 = await this.imageService.generateImage(
      `${SCENE_PREFIX}${scene}, slightly later moment, subtle movement`
    );
    const frames =
      frame2.success && frame2.imageData
        ? [frame1.imageData, frame2.imageData]
        : [frame1.imageData, frame1.imageData];

    if (!frame2.success) {
      logWarn('Cloudflare GIF: second frame skipped, looping first frame', {
        error: frame2.error,
      });
    }

    return this.toGifResult(frames, frame1.imageData);
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
      logWarn('Cloudflare GIF: photo edit failed, looping original photo', {
        error: frame2.error,
      });
      return this.toGifResult([frame1B64, frame1B64], frame1B64);
    }

    return this.toGifResult([frame1B64, frame2.imageData], frame1B64);
  }

  private async toGifResult(frames: string[], previewFallback: string): Promise<VideoResult> {
    try {
      const gif = await encodeGifFromBase64Frames(frames, this.frameDelayMs, {
        crossfadeSteps: this.crossfadeSteps,
      });
      logInfo('Cloudflare GIF encoded', {
        bytes: gif.length,
        keyframes: frames.length,
        crossfadeSteps: this.crossfadeSteps,
      });
      return {
        success: true,
        mode: 'gif',
        imageBase64: gif.toString('base64'),
        mimeType: 'image/gif',
      };
    } catch (err) {
      logWarn('Cloudflare GIF encode failed, trying static GIF', { err });
    }

    try {
      const gif = await encodeStaticGifFromBase64(previewFallback);
      logInfo('Cloudflare static GIF encoded', { bytes: gif.length });
      return {
        success: true,
        mode: 'gif',
        imageBase64: gif.toString('base64'),
        mimeType: 'image/gif',
      };
    } catch (err) {
      logWarn('Cloudflare static GIF failed, sending preview still', { err });
    }

    return {
      success: true,
      mode: 'preview',
      imageBase64: previewFallback,
      mimeType: 'image/jpeg',
    };
  }
}
