import { Context } from 'grammy';
import type { AppConfig } from './config';
import type { GeminiService } from './services/geminiService';
import type { TranslationKey } from './i18n/en';

export type TranslateFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

export interface BotServices {
  config: AppConfig;
  gemini: GeminiService;
}

export type AppContext = Context & BotServices & {
  t: TranslateFn;
};
