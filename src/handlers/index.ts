import { Bot } from 'grammy';
import type { AppContext } from '../context';
import { registerStartHandlers } from './start';
import { registerCommandHandlers } from './commands';
import { registerGenerateHandlers } from './generate';
import { registerPhotoHandlers } from './photo';
import { registerVideoHandlers } from './video';
import { registerVideoGifHandlers } from './videogif';
import { registerMusicHandlers } from './music';
import { registerVideoPhotoHandlers } from './videoPhoto';
import { registerCallbackHandlers } from './callbacks';
import { registerInlineHandlers } from './inline';
import { registerTextHandlers } from './text';

export function registerHandlers(bot: Bot<AppContext>): void {
  registerStartHandlers(bot);
  registerCommandHandlers(bot);
  registerGenerateHandlers(bot);
  registerVideoHandlers(bot);
  registerVideoGifHandlers(bot);
  registerMusicHandlers(bot);
  registerVideoPhotoHandlers(bot);
  registerPhotoHandlers(bot);
  registerCallbackHandlers(bot);
  registerInlineHandlers(bot);
  registerTextHandlers(bot);
}
