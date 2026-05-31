import { Context } from 'grammy';
import type { AppConfig } from './config';
import type { ImageService } from './services/imageService';
import type { VideoGifService } from './services/videoGifService';
import type { FalVideoService } from './services/providers/falVideo';
import type { MusicService } from './services/musicService';
import type { TranslationKey } from './i18n/en';

export type TranslateFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

export interface BotServices {
  config: AppConfig;
  imageService: ImageService;
  videoGifService?: VideoGifService;
  falVideoService?: FalVideoService;
  musicService?: MusicService;
}

export type AppContext = Context &
  BotServices & {
    t: TranslateFn;
  };
