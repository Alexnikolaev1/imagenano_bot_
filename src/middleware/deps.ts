import { NextFunction } from 'grammy';
import type { AppContext, BotServices } from '../context';
import { createTranslator } from '../i18n';
import { getUserLang } from '../storage/userPrefs';

export function createDepsMiddleware(services: BotServices) {
  return async (ctx: AppContext, next: NextFunction): Promise<void> => {
    ctx.config = services.config;
    ctx.imageService = services.imageService;
    ctx.videoGifService = services.videoGifService;
    ctx.colabVideoService = services.colabVideoService;
    ctx.musicService = services.musicService;

    const userId = ctx.from?.id;
    const lang = userId
      ? getUserLang(userId, ctx.from?.language_code)
      : services.config.defaultLang;
    ctx.t = createTranslator(lang);

    await next();
  };
}
