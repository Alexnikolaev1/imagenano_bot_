import { Bot } from 'grammy';
import type { AppContext } from '../context';
import { registerStartHandlers } from './start';
import { registerCommandHandlers } from './commands';
import { registerGenerateHandlers } from './generate';
import { registerPhotoHandlers } from './photo';
import { registerCallbackHandlers } from './callbacks';
import { registerInlineHandlers } from './inline';
import { registerTextHandlers } from './text';

export function registerHandlers(bot: Bot<AppContext>): void {
  registerStartHandlers(bot);
  registerCommandHandlers(bot);
  registerGenerateHandlers(bot);
  registerPhotoHandlers(bot);
  registerCallbackHandlers(bot);
  registerInlineHandlers(bot);
  registerTextHandlers(bot);
}
