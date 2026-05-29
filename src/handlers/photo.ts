import { Bot } from 'grammy';
import type { AppContext } from '../context';
import { assertRateLimit } from '../services/rateLimitGuard';
import { runImageJob } from '../services/imagePipeline';
import { getUserLang } from '../storage/userPrefs';
import { logError } from '../utils/logger';

export function registerPhotoHandlers(bot: Bot<AppContext>): void {
  bot.on('message:photo', async (ctx) => {
    await handlePhotoMessage(ctx);
  });

  bot.on('message:document', async (ctx) => {
    const doc = ctx.message.document;
    if (!doc.mime_type?.startsWith('image/')) {
      await ctx.reply(ctx.t('notImage'));
      return;
    }
    await handlePhotoMessage(ctx, doc.file_id);
  });
}

async function handlePhotoMessage(ctx: AppContext, overrideFileId?: string): Promise<void> {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  if (!userId || !chatId) return;

  const lang = getUserLang(userId, ctx.from?.language_code);
  const message = ctx.message;
  if (!message) return;

  const caption = message.caption?.trim() || '';
  const isVariation = /^\/variation\b/i.test(caption) || caption === '/variation';
  const isEdit = /^\/edit\b/i.test(caption);
  const instruction = isEdit
    ? caption.replace(/^\/edit\s*/i, '').trim()
    : isVariation
      ? ''
      : caption;

  if (!isVariation && !instruction) {
    await ctx.reply(ctx.t('needPhotoInstruction'), { parse_mode: 'HTML' });
    return;
  }

  const guard = assertRateLimit(userId, ctx.config.maxRequestsPerDay, lang);
  if (!guard.ok) {
    await ctx.reply(guard.message, { parse_mode: 'HTML' });
    return;
  }

  let fileId = overrideFileId;
  if (!fileId) {
    const photos = message.photo;
    if (!photos?.length) {
      await ctx.reply(ctx.t('noPhoto'));
      return;
    }
    fileId = photos[photos.length - 1].file_id;
  }

  const statusMsg = await ctx.reply(isVariation ? ctx.t('varying') : ctx.t('editing'));

  const jobType = isVariation ? 'variation' : 'edit';

  try {
    await runImageJob({
      chatId,
      statusMessageId: statusMsg.message_id,
      userId,
      type: jobType,
      fileId,
      instruction,
      lang,
      enhance: false,
      imageService: ctx.imageService,
      t: ctx.t,
    });
  } catch (err) {
    logError('Photo job failed', err);
  }
}
