import { Bot } from 'grammy';
import type { AppContext } from '../context';
import { assertRateLimit } from '../services/rateLimitGuard';
import { runImageJob } from '../services/imagePipeline';
import { getUserLang, getUserStyle } from '../storage/userPrefs';
import { logError, logInfo } from '../utils/logger';

const MENU_BUTTONS = new Set([
  '🎨 Сгенерировать',
  '🎨 Generate',
  '🎭 Стиль',
  '🎭 Style',
  '📊 Статистика',
  '📊 Stats',
  '❓ Помощь',
  '❓ Help',
]);

export function registerTextHandlers(bot: Bot<AppContext>): void {
  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (!text || text.startsWith('/') || MENU_BUTTONS.has(text)) return;

    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    if (!userId || !chatId) return;

    const lang = getUserLang(userId, ctx.from?.language_code);
    const guard = assertRateLimit(userId, ctx.config.maxRequestsPerDay, lang);
    if (!guard.ok) {
      await ctx.reply(guard.message, { parse_mode: 'HTML' });
      return;
    }

    const styleKey = getUserStyle(userId);

    const statusMsg = await ctx.reply(ctx.t('generating'), { parse_mode: 'HTML' });
    logInfo('Text generate', { userId, prompt: text.slice(0, 80) });

    runImageJob({
      chatId,
      statusMessageId: statusMsg.message_id,
      userId,
      type: 'generate',
      prompt: text,
      styleKey,
      lang,
      enhance: ctx.config.enhancePrompts,
      imageService: ctx.imageService,
      enhancer: ctx.imageService.getEnhancer(),
      t: ctx.t,
    }).catch((err) => logError('Text generate job failed', err));
  });
}
