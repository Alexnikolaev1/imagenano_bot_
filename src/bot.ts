import { Bot } from 'grammy';
import { loadConfig } from './config';
import type { AppContext } from './context';
import { createDepsMiddleware } from './middleware/deps';
import { ImageService } from './services/imageService';
import { PromptEnhancer } from './services/promptEnhancer';
import { createVideoServiceFromEnv } from './services/videoService';
import { createMusicServiceFromEnv } from './services/musicService';
import { registerHandlers } from './handlers';
import { logError } from './utils/logger';

export function createBot(): { bot: Bot<AppContext>; imageService: ImageService } {
  const config = loadConfig();

  const enhancer =
    config.enhancePrompts && config.googleApiKey
      ? new PromptEnhancer(config.googleApiKey, config.geminiTextModel)
      : undefined;

  const imageService = new ImageService({
    accountId: config.cloudflareAccountId,
    apiToken: config.cloudflareApiToken,
    generateModel: config.cloudflareImageModel,
    editModel: config.cloudflareEditImageModel,
    enhancer,
  });

  const videoService =
    config.videoEnabled ? createVideoServiceFromEnv(imageService) ?? undefined : undefined;

  const musicService =
    config.musicEnabled ? createMusicServiceFromEnv() ?? undefined : undefined;

  const bot = new Bot<AppContext>(config.telegramToken);

  bot.use(createDepsMiddleware({ config, imageService, videoService, musicService }));

  bot.catch((err) => {
    logError('grammY bot error', {
      message: err.message,
      updateId: err.ctx?.update?.update_id,
    });
  });

  registerHandlers(bot);

  return { bot, imageService };
}
