// src/services/videoPipeline.ts — text/image-to-video (mp4, GIF, or preview still)

import type { VideoGenerator } from './videoGenerator';
import { sendAnimation, sendPhoto, sendVideo, sendVideoBase64, editMessage } from './telegramSender';
import { downloadTelegramFile, bufferToBase64 } from '../utils/fileUtils';
import { errorMessage, escapeHtml } from '../utils/messages';
import { logError, logInfo } from '../utils/logger';
import type { TranslateFn } from '../context';
import type { Lang } from '../i18n';
import type { VideoResult } from '../types';

export type VideoJobType = 'text' | 'image';
export type VideoJobKind = 'mp4' | 'gif';

export interface VideoJobParams {
  chatId: number;
  statusMessageId: number;
  userId: number;
  type: VideoJobType;
  kind: VideoJobKind;
  prompt: string;
  fileId?: string;
  lang: Lang;
  maxPerDay: number;
  videoService: VideoGenerator;
  consumeRateLimit: (userId: number, maxPerDay: number) => void;
  t: TranslateFn;
}

export async function runVideoJob(params: VideoJobParams): Promise<void> {
  const {
    chatId,
    statusMessageId,
    userId,
    type,
    kind,
    prompt,
    videoService,
    t,
    lang,
    maxPerDay,
    consumeRateLimit,
  } = params;
  const started = Date.now();

  try {
    let result: VideoResult;

    if (type === 'text') {
      logInfo('Video job: text-to-video', {
        userId,
        kind,
        prompt: prompt.slice(0, 80),
        provider: videoService.provider,
      });
      result = await videoService.textToVideo(prompt);
    } else {
      const token = process.env.TELEGRAM_BOT_TOKEN!;
      const fileId = params.fileId;
      if (!fileId) throw new Error('fileId required for image-to-video');

      const { data, mimeType } = await downloadTelegramFile(token, fileId);
      const base64 = bufferToBase64(data);
      logInfo('Video job: image-to-video', { userId, kind, prompt: prompt.slice(0, 80) });
      result = await videoService.imageToVideo(prompt, base64, mimeType);
    }

    if (!result.success) {
      await editMessage(
        chatId,
        statusMessageId,
        errorMessage(result.error || 'unknown', undefined, lang),
        { parse_mode: 'HTML' }
      );
      return;
    }

    consumeRateLimit(userId, maxPerDay);

    const elapsed = Math.round((Date.now() - started) / 1000);
    const caption = buildCaption(result, type, kind, prompt, t);

    if (result.mode === 'gif' && result.imageBase64) {
      await editMessage(chatId, statusMessageId, t('videoGifSending', { seconds: String(elapsed) }));
      logInfo('Sending GIF clip to Telegram', { userId, provider: videoService.provider });
      await sendAnimation(chatId, result.imageBase64, caption);
      await editMessage(chatId, statusMessageId, t('videoGifSent'));
      return;
    }

    if (result.mode === 'preview' && result.imageBase64) {
      await editMessage(chatId, statusMessageId, t('videoPreviewSending', { seconds: String(elapsed) }));
      logInfo('Sending preview still to Telegram', { userId, provider: videoService.provider });
      await sendPhoto(chatId, result.imageBase64, result.mimeType || 'image/jpeg', caption);
      await editMessage(chatId, statusMessageId, t('videoPreviewSent'));
      return;
    }

    if (!result.videoUrl && !result.videoBase64) {
      await editMessage(chatId, statusMessageId, errorMessage('unknown', undefined, lang), {
        parse_mode: 'HTML',
      });
      return;
    }

    await editMessage(chatId, statusMessageId, t('videoDoneSending', { seconds: String(elapsed) }));
    logInfo('Sending mp4 video to Telegram', { userId, provider: videoService.provider });
    if (result.videoBase64) {
      await sendVideoBase64(
        chatId,
        result.videoBase64,
        result.mimeType || 'video/mp4',
        caption
      );
    } else {
      await sendVideo(chatId, result.videoUrl!, caption);
    }
    await editMessage(chatId, statusMessageId, t('videoSent'));
  } catch (err) {
    logError('runVideoJob failed', err);
    await editMessage(
      chatId,
      statusMessageId,
      errorMessage('unknown', undefined, lang),
      { parse_mode: 'HTML' }
    ).catch(() => undefined);
  }
}

function buildCaption(
  result: VideoResult,
  type: VideoJobType,
  kind: VideoJobKind,
  prompt: string,
  t: TranslateFn
): string {
  const p = `<i>${escapeHtml(prompt.slice(0, 180))}</i>`;
  if (result.mode === 'gif' || kind === 'gif') {
    return type === 'image'
      ? `${t('videoGifFromImageCaption')} ${p}`
      : `${t('videoGifCaption')} ${p}`;
  }
  if (result.mode === 'preview') {
    return type === 'image'
      ? `${t('videoPreviewFromImageCaption')} ${p}`
      : `${t('videoPreviewCaption')} ${p}`;
  }
  return type === 'image'
    ? `${t('videoFromImageCaption')} ${p}`
    : `${t('videoGeneratedCaption')} ${p}`;
}
