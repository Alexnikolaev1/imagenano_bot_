import { Bot } from 'grammy';
import type { AppContext } from '../context';
import { assertColabVideoRateLimit, assertVideoGifRateLimit } from '../services/rateLimitGuard';
import { runVideoJob } from '../services/videoPipeline';
import { consumeColabVideoRateLimit, consumeVideoGifRateLimit } from '../utils/rateLimit';
import { getUserLang } from '../storage/userPrefs';
import { logError, logInfo } from '../utils/logger';

/** /video — Colab/ngrok MP4 when VIDEO_API is set; /videogif — free Cloudflare GIF */
export function registerVideoHandlers(bot: Bot<AppContext>): void {
  bot.command('video', async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    if (!userId || !chatId) return;

    const lang = getUserLang(userId, ctx.from?.language_code);
    const rawPrompt = typeof ctx.match === 'string' ? ctx.match.trim() : '';

    if (!rawPrompt) {
      await ctx.reply(ctx.t('videoHowTo'), { parse_mode: 'HTML' });
      return;
    }

    if (ctx.colabVideoService) {
      const guard = assertColabVideoRateLimit(userId, ctx.config.maxColabVideoRequestsPerDay, lang);
      if (!guard.ok) {
        await ctx.reply(guard.message, { parse_mode: 'HTML' });
        return;
      }

      const statusMsg = await ctx.reply(ctx.t('videoGenerating'), { parse_mode: 'HTML' });
      logInfo('Video command (Colab)', { userId, prompt: rawPrompt.slice(0, 80) });

      try {
        await runVideoJob({
          chatId,
          statusMessageId: statusMsg.message_id,
          userId,
          type: 'text',
          kind: 'mp4',
          prompt: rawPrompt,
          lang,
          maxPerDay: ctx.config.maxColabVideoRequestsPerDay,
          videoService: ctx.colabVideoService,
          consumeRateLimit: consumeColabVideoRateLimit,
          t: ctx.t,
        });
      } catch (err) {
        logError('Video command (Colab) failed', err);
      }
      return;
    }

    if (!ctx.videoGifService) {
      await ctx.reply(ctx.t('videoNotConfigured'), { parse_mode: 'HTML' });
      return;
    }

    await ctx.reply(ctx.t('colabNotConfigured'), { parse_mode: 'HTML' });
  });

  bot.command('videogif', async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    if (!userId || !chatId) return;

    const lang = getUserLang(userId, ctx.from?.language_code);

    if (!ctx.videoGifService) {
      await ctx.reply(ctx.t('videoNotConfigured'), { parse_mode: 'HTML' });
      return;
    }

    const rawPrompt = typeof ctx.match === 'string' ? ctx.match.trim() : '';
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
      logError('VideoGif command failed', err);
    }
  });
}
