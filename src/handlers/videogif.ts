import { Bot } from 'grammy';
import type { AppContext } from '../context';
import { assertVideoGifRateLimit } from '../services/rateLimitGuard';
import { runVideoJob } from '../services/videoPipeline';
import { consumeVideoGifRateLimit } from '../utils/rateLimit';
import { getUserLang } from '../storage/userPrefs';
import { logError, logInfo } from '../utils/logger';

/** Free looping GIF via Cloudflare Flux */
export function registerVideoGifHandlers(bot: Bot<AppContext>): void {
  bot.command('videogif', async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    if (!userId || !chatId) return;

    const lang = getUserLang(userId, ctx.from?.language_code);

    if (!ctx.videoGifService) {
      await ctx.reply(ctx.t('videoGifNotConfigured'), { parse_mode: 'HTML' });
      return;
    }

    const rawPrompt = ctx.match?.trim();
    if (!rawPrompt) {
      await ctx.reply(ctx.t('videoGifHowTo'), { parse_mode: 'HTML' });
      return;
    }

    const guard = assertVideoGifRateLimit(userId, ctx.config.maxVideoGifRequestsPerDay, lang);
    if (!guard.ok) {
      await ctx.reply(guard.message, { parse_mode: 'HTML' });
      return;
    }

    const statusMsg = await ctx.reply(ctx.t('videoGifGenerating'), { parse_mode: 'HTML' });
    logInfo('VideoGif command', { userId, prompt: rawPrompt.slice(0, 80) });

    try {
      await runVideoJob({
        chatId,
        statusMessageId: statusMsg.message_id,
        userId,
        type: 'text',
        kind: 'gif',
        prompt: rawPrompt,
        lang,
        maxPerDay: ctx.config.maxVideoGifRequestsPerDay,
        videoService: ctx.videoGifService,
        consumeRateLimit: consumeVideoGifRateLimit,
        t: ctx.t,
      });
    } catch (err) {
      logError('VideoGif command job failed', err);
    }
  });
}
