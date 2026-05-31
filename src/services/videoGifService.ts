// Free looping GIF clips via Cloudflare Flux

import type { ImageService } from './imageService';
import { CloudflareGifVideoService } from './providers/cloudflareGifVideo';

export type VideoGifService = CloudflareGifVideoService;

export function createVideoGifServiceFromEnv(imageService: ImageService): VideoGifService {
  const gifDelayMs = parseInt(process.env.VIDEO_GIF_FRAME_DELAY_MS || '130', 10);
  const gifCrossfadeSteps = parseInt(process.env.VIDEO_GIF_CROSSFADE_STEPS || '6', 10);
  return new CloudflareGifVideoService(imageService, gifDelayMs, gifCrossfadeSteps);
}
