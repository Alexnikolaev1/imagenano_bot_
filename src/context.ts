import { Context } from 'grammy';
import type { AppConfig } from './config';
import type { ImageService } from './services/imageService';
import type { TranslationKey } from './i18n/en';

export type TranslateFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

export interface BotServices {
  config: AppConfig;
  imageService: ImageService;
}

export type AppContext = Context & BotServices & {
  t: TranslateFn;
};
