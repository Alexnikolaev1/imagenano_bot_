import { Bot } from 'grammy';
import type { AppContext } from '../context';
import { assertFalVideoRateLimit, assertVideoGifRateLimit } from '../services/rateLimitGuard';
import { runVideoJob } from '../services/videoPipeline';
import { consumeFalVideoRateLimit, consumeVideoGifRateLimit } from '../utils/rateLimit';
import { getUserLang } from '../storage/userPrefs';
import { logError, logInfo } from '../utils/logger';

type PhotoVideoMode = 'mp4' | 'gif';

/** Photo + /video or /videogif caption — image-to-video */
export function registerVideoPhotoHandlers(bot: Bot<AppContext>): void {
  bot.on('message:photo', async (ctx, next) => {
    const caption = ctx.message.caption?.trim() || '';
    const mode = parsePhotoVideoMode(caption);
    if (!mode) {
      await next();
      return;
    }

    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    if (!userId || !chatId) return;

    const lang = getUserLang(userId, ctx.from?.language_code);
    const prompt = stripVideoCommand(caption, mode);
    if (!prompt) {
      await ctx.reply(mode === 'gif' ? ctx.t('needVideoGifPrompt') : ctx.t('needVideoPrompt'), {
        parse_mode: 'HTML',
      });
      return;
    }

    if (mode === 'gif') {
      if (!ctx.videoGifService) {
        await ctx.reply(ctx.t('videoGifNotConfigured'), { parse_mode: 'HTML' });
        return;
      }
      const guard = assertVideoGifRateLimit(userId, ctx.config.maxVideoGifRequestsPerDay, lang);
      if (!guard.ok) {
        await ctx.reply(guard.message, { parse_mode: 'HTML' });
        return;
      }
    } else {
      if (!ctx.falVideoService) {
        await ctx.reply(ctx.t('falVideoNotConfigured'), { parse_mode: 'HTML' });
        return;
      }
      const guard = assertFalVideoRateLimit(userId, ctx.config.maxFalVideoRequestsPerDay, lang);
      if (!guard.ok) {
        await ctx.reply(guard.message, { parse_mode: 'HTML' });
        return;
      }
    }

    const photos = ctx.message.photo;
    if (!photos?.length) return;

    const fileId = photos[photos.length - 1].file_id;
    const statusMsg = await ctx.reply(
      mode === 'gif' ? ctx.t('videoGifFromImage') : ctx.t('videoFromImage'),
      { parse_mode: 'HTML' }
    );
    logInfo('Video from photo', { userId, mode, prompt: prompt.slice(0, 80) });

    try {
      if (mode === 'gif') {
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
          videoService: ctx.videoGifService!,
          consumeRateLimit: consumeVideoGifRateLimit,
          t: ctx.t,
        });
      } else {
        await runVideoJob({
          chatId,
          statusMessageId: statusMsg.message_id,
          userId,
          type: 'image',
          kind: 'mp4',
          prompt,
          fileId,
          lang,
          maxPerDay: ctx.config.maxFalVideoRequestsPerDay,
          videoService: ctx.falVideoService!,
          consumeRateLimit: consumeFalVideoRateLimit,
          t: ctx.t,
        });
      }
    } catch (err) {
      logError('Video photo job failed', err);
    }
  });
}

function parsePhotoVideoMode(caption: string): PhotoVideoMode | null {
  if (/^\/videogif\b/i.test(caption)) return 'gif';
  if (/^\/video\b/i.test(caption)) return 'mp4';
  return null;
}

function stripVideoCommand(caption: string, mode: PhotoVideoMode): string {
  if (mode === 'gif') return caption.replace(/^\/videogif\s*/i, '').trim();
  return caption.replace(/^\/video\s*/i, '').trim();
}
