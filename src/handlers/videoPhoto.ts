import { Bot } from 'grammy';
import type { AppContext } from '../context';
import { assertColabVideoRateLimit, assertVideoGifRateLimit } from '../services/rateLimitGuard';
import { runVideoJob } from '../services/videoPipeline';
import { consumeColabVideoRateLimit, consumeVideoGifRateLimit } from '../utils/rateLimit';
import { getUserLang } from '../storage/userPrefs';
import { logError, logInfo } from '../utils/logger';

/** Photo + /video or /videogif caption */
export function registerVideoPhotoHandlers(bot: Bot<AppContext>): void {
  bot.on('message:photo', async (ctx, next) => {
    const caption = ctx.message.caption?.trim() || '';
    const isGif = /^\/videogif\b/i.test(caption);
    const isVideo = /^\/video\b/i.test(caption) && !isGif;
    if (!isGif && !isVideo) {
      await next();
      return;
    }

    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    if (!userId || !chatId) return;

    const lang = getUserLang(userId, ctx.from?.language_code);
    const prompt = caption.replace(/^\/videogif\s*/i, '').replace(/^\/video\s*/i, '').trim();
    if (!prompt) {
      await ctx.reply(ctx.t('needVideoPrompt'), { parse_mode: 'HTML' });
      return;
    }

    const photos = ctx.message.photo;
    if (!photos?.length) return;
    const fileId = photos[photos.length - 1].file_id;

    if (isGif) {
      if (!ctx.videoGifService) {
        await ctx.reply(ctx.t('videoNotConfigured'), { parse_mode: 'HTML' });
        return;
      }
      const guard = assertVideoGifRateLimit(userId, ctx.config.maxVideoGifRequestsPerDay, lang);
      if (!guard.ok) {
        await ctx.reply(guard.message, { parse_mode: 'HTML' });
        return;
      }

      const statusMsg = await ctx.reply(ctx.t('videoGifFromImage'), { parse_mode: 'HTML' });
      logInfo('Video from photo (GIF)', { userId, prompt: prompt.slice(0, 80) });

      try {
        await runVideoJob({
          chatId,
          statusMessageId: statusMsg.message_id,
          userId,
          type: 'image',
          kind: 'gif',
          prompt,
          fileId,
          lang,
          maxPerDay: ctx.config.maxVideoGifRequestsPerDay,
          videoService: ctx.videoGifService,
          consumeRateLimit: consumeVideoGifRateLimit,
          t: ctx.t,
        });
      } catch (err) {
        logError('Video photo (GIF) failed', err);
      }
      return;
    }

    if (!ctx.colabVideoService) {
      await ctx.reply(ctx.t('colabNotConfigured'), { parse_mode: 'HTML' });
      return;
    }

    const guard = assertColabVideoRateLimit(userId, ctx.config.maxColabVideoRequestsPerDay, lang);
    if (!guard.ok) {
      await ctx.reply(guard.message, { parse_mode: 'HTML' });
      return;
    }

    const statusMsg = await ctx.reply(ctx.t('videoFromImage'), { parse_mode: 'HTML' });
    logInfo('Video from photo (Colab)', { userId, prompt: prompt.slice(0, 80) });

    try {
      await runVideoJob({
        chatId,
        statusMessageId: statusMsg.message_id,
        userId,
        type: 'image',
        kind: 'mp4',
        prompt,
        fileId,
        lang,
        maxPerDay: ctx.config.maxColabVideoRequestsPerDay,
        videoService: ctx.colabVideoService,
        consumeRateLimit: consumeColabVideoRateLimit,
        t: ctx.t,
      });
    } catch (err) {
      logError('Video photo (Colab) failed', err);
    }
  });
}
