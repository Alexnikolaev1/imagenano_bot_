import { Bot } from 'grammy';
import type { AppContext } from '../context';
import { assertFalVideoRateLimit } from '../services/rateLimitGuard';
import { runVideoJob } from '../services/videoPipeline';
import { consumeFalVideoRateLimit } from '../utils/rateLimit';
import { getUserLang } from '../storage/userPrefs';
import { logError, logInfo } from '../utils/logger';

/** Real MP4 video via fal.ai */
export function registerVideoHandlers(bot: Bot<AppContext>): void {
  bot.command('video', async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    if (!userId || !chatId) return;

    const lang = getUserLang(userId, ctx.from?.language_code);

    if (!ctx.falVideoService) {
      await ctx.reply(ctx.t('falVideoNotConfigured'), { parse_mode: 'HTML' });
      return;
    }

    const rawPrompt = ctx.match?.trim();
    if (!rawPrompt) {
      await ctx.reply(ctx.t('videoHowTo'), { parse_mode: 'HTML' });
      return;
    }

    const guard = assertFalVideoRateLimit(userId, ctx.config.maxFalVideoRequestsPerDay, lang);
    if (!guard.ok) {
      await ctx.reply(guard.message, { parse_mode: 'HTML' });
      return;
    }

    const statusMsg = await ctx.reply(ctx.t('videoGenerating'), { parse_mode: 'HTML' });
    logInfo('Video command (fal)', { userId, prompt: rawPrompt.slice(0, 80) });

    try {
      await runVideoJob({
        chatId,
        statusMessageId: statusMsg.message_id,
        userId,
        type: 'text',
        kind: 'mp4',
        prompt: rawPrompt,
        lang,
        maxPerDay: ctx.config.maxFalVideoRequestsPerDay,
        videoService: ctx.falVideoService,
        consumeRateLimit: consumeFalVideoRateLimit,
        t: ctx.t,
      });
    } catch (err) {
      logError('Video command job failed', err);
    }
  });
}
