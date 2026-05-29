import { Bot } from 'grammy';
import type { AppContext } from '../context';
import { assertVideoRateLimit } from '../services/rateLimitGuard';
import { runVideoJob } from '../services/videoPipeline';
import { getUserLang } from '../storage/userPrefs';
import { logError, logInfo } from '../utils/logger';

/** Photo + /video prompt — image-to-video (Wan I2V) */
export function registerVideoPhotoHandlers(bot: Bot<AppContext>): void {
  bot.on('message:photo', async (ctx, next) => {
    const caption = ctx.message.caption?.trim() || '';
    if (!/^\/video\b/i.test(caption)) {
      await next();
      return;
    }

    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    if (!userId || !chatId) return;

    const lang = getUserLang(userId, ctx.from?.language_code);

    if (!ctx.videoService) {
      await ctx.reply(ctx.t('videoNotConfigured'), { parse_mode: 'HTML' });
      return;
    }

    const prompt = caption.replace(/^\/video\s*/i, '').trim();
    if (!prompt) {
      await ctx.reply(ctx.t('needVideoPrompt'), { parse_mode: 'HTML' });
      return;
    }

    const guard = assertVideoRateLimit(userId, ctx.config.maxVideoRequestsPerDay, lang);
    if (!guard.ok) {
      await ctx.reply(guard.message, { parse_mode: 'HTML' });
      return;
    }

    const photos = ctx.message.photo;
    if (!photos?.length) return;

    const fileId = photos[photos.length - 1].file_id;
    const statusMsg = await ctx.reply(ctx.t('videoFromImage'), { parse_mode: 'HTML' });
    logInfo('Video from photo', { userId, prompt: prompt.slice(0, 80) });

    try {
      await runVideoJob({
        chatId,
        statusMessageId: statusMsg.message_id,
        userId,
        type: 'image',
        prompt,
        fileId,
        lang,
        videoService: ctx.videoService,
        t: ctx.t,
      });
    } catch (err) {
      logError('Video photo job failed', err);
    }
  });
}
