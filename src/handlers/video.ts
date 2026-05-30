import { Bot } from 'grammy';
import type { AppContext } from '../context';
import { assertVideoRateLimit } from '../services/rateLimitGuard';
import { runVideoJob } from '../services/videoPipeline';
import { getUserLang } from '../storage/userPrefs';
import { logError, logInfo } from '../utils/logger';

export function registerVideoHandlers(bot: Bot<AppContext>): void {
  bot.command('video', async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    if (!userId || !chatId) return;

    const lang = getUserLang(userId, ctx.from?.language_code);

    if (!ctx.videoService) {
      await ctx.reply(ctx.t('videoNotConfigured'), { parse_mode: 'HTML' });
      return;
    }

    const rawPrompt = ctx.match?.trim();
    if (!rawPrompt) {
      await ctx.reply(ctx.t('videoHowTo'), { parse_mode: 'HTML' });
      return;
    }

    const guard = assertVideoRateLimit(userId, ctx.config.maxVideoRequestsPerDay, lang);
    if (!guard.ok) {
      await ctx.reply(guard.message, { parse_mode: 'HTML' });
      return;
    }

    const statusMsg = await ctx.reply(ctx.t('videoGenerating'), { parse_mode: 'HTML' });
    logInfo('Video command', { userId, prompt: rawPrompt.slice(0, 80) });

    try {
      await runVideoJob({
        chatId,
        statusMessageId: statusMsg.message_id,
        userId,
        type: 'text',
        prompt: rawPrompt,
        lang,
        maxVideoRequestsPerDay: ctx.config.maxVideoRequestsPerDay,
        videoService: ctx.videoService,
        t: ctx.t,
      });
    } catch (err) {
      logError('Video command job failed', err);
    }
  });
}
