import { Bot } from 'grammy';
import type { AppContext } from '../context';
import { assertRateLimit } from '../services/rateLimitGuard';
import { runImageJob } from '../services/imagePipeline';
import { getUserLang, getUserStyle } from '../storage/userPrefs';
import { logError, logInfo } from '../utils/logger';

export function registerGenerateHandlers(bot: Bot<AppContext>): void {
  bot.command('generate', async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    if (!userId || !chatId) return;

    const lang = getUserLang(userId, ctx.from?.language_code);
    const rawPrompt = ctx.match?.trim();
    if (!rawPrompt) {
      await ctx.reply(ctx.t('needPrompt'), { parse_mode: 'HTML' });
      return;
    }

    const guard = assertRateLimit(userId, ctx.config.maxRequestsPerDay, lang);
    if (!guard.ok) {
      await ctx.reply(guard.message, { parse_mode: 'HTML' });
      return;
    }

    const styleKey = getUserStyle(userId);

    const statusMsg = await ctx.reply(ctx.t('generating'), { parse_mode: 'HTML' });
    logInfo('Generate command', { userId, prompt: rawPrompt.slice(0, 80) });

    runImageJob({
      chatId,
      statusMessageId: statusMsg.message_id,
      userId,
      type: 'generate',
      prompt: rawPrompt,
      styleKey,
      lang,
      enhance: ctx.config.enhancePrompts,
      imageService: ctx.imageService,
      enhancer: ctx.imageService.getEnhancer(),
      t: ctx.t,
    }).catch((err) => logError('Generate job failed', err));
  });
}
