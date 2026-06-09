import { Bot } from 'grammy';
import { loadConfig } from './config';
import type { AppContext } from './context';
import { createDepsMiddleware } from './middleware/deps';
import { ImageService } from './services/imageService';
import { PromptEnhancer } from './services/promptEnhancer';
import { createVideoGifServiceFromEnv } from './services/videoGifService';
import { createColabVideoServiceFromEnv } from './services/colabVideoService';
import { createHfSpaceVideoServiceFromEnv } from './services/hfSpaceVideoService';
import { createMusicServiceFromEnv } from './services/musicService';
import { registerHandlers } from './handlers';
import { logError, logInfo } from './utils/logger';

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

  const videoGifService =
    config.videoGifEnabled ? createVideoGifServiceFromEnv(imageService) : undefined;

  const hfSpaceVideoService =
    config.hfVideoEnabled && config.hfVideoSpace
      ? createHfSpaceVideoServiceFromEnv() ?? undefined
      : undefined;

  const colabVideoService =
    !hfSpaceVideoService &&
    config.colabVideoEnabled &&
    config.videoApiUrl
      ? createColabVideoServiceFromEnv(imageService) ?? undefined
      : undefined;

  if (hfSpaceVideoService) {
    logInfo('MP4 video provider: HF Space', { space: config.hfVideoSpace });
  } else if (colabVideoService) {
    logInfo('MP4 video provider: Colab/ngrok', { videoApi: config.videoApiUrl?.slice(0, 60) });
  } else {
    logInfo('MP4 video provider: none (set HF_VIDEO_SPACE or VIDEO_API)');
  }

  const musicService =
    config.musicEnabled ? createMusicServiceFromEnv() ?? undefined : undefined;

  const bot = new Bot<AppContext>(config.telegramToken);

  bot.use(
    createDepsMiddleware({
      config,
      imageService,
      videoGifService,
      colabVideoService,
      hfSpaceVideoService,
      musicService,
    })
  );

  bot.catch((err) => {
    logError('grammY bot error', {
      message: err.message,
      updateId: err.ctx?.update?.update_id,
    });
  });

  registerHandlers(bot);

  return { bot, imageService };
}
