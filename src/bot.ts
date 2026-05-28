import { Bot } from 'grammy';
import { loadConfig } from './config';
import type { AppContext } from './context';
import { createDepsMiddleware } from './middleware/deps';
import { GeminiService } from './services/geminiService';
import { registerHandlers } from './handlers';
import { logError } from './utils/logger';

export function createBot(): { bot: Bot<AppContext>; gemini: GeminiService } {
  const config = loadConfig();
  const gemini = new GeminiService(
    config.googleApiKey,
    config.geminiImageModel,
    config.enhancePrompts
  );

  const bot = new Bot<AppContext>(config.telegramToken);

  bot.use(createDepsMiddleware({ config, gemini }));

  bot.catch((err) => {
    logError('grammY bot error', {
      message: err.message,
      updateId: err.ctx?.update?.update_id,
    });
  });

  registerHandlers(bot);

  return { bot, gemini };
}
