// src/services/musicPipeline.ts — text-to-music via Hugging Face or ModelScope MusicGen

import { MusicService } from './musicService';
import { consumeMusicRateLimit } from '../utils/rateLimit';
import { sendAudio, editMessage } from './telegramSender';
import { downloadBufferFromUrl } from '../utils/fileUtils';
import { errorMessage, escapeHtml } from '../utils/messages';
import { logError, logInfo } from '../utils/logger';
import type { TranslateFn } from '../context';
import type { Lang } from '../i18n';
import type { MusicResult } from '../types';

export interface MusicJobParams {
  chatId: number;
  statusMessageId: number;
  userId: number;
  prompt: string;
  lang: Lang;
  maxMusicRequestsPerDay: number;
  musicService: MusicService;
  t: TranslateFn;
}

export async function runMusicJob(params: MusicJobParams): Promise<void> {
  const { chatId, statusMessageId, userId, prompt, musicService, t, lang, maxMusicRequestsPerDay } =
    params;
  const started = Date.now();

  try {
    logInfo('Music job: text-to-music', {
      userId,
      prompt: prompt.slice(0, 80),
      provider: musicService.provider,
    });
    const result = await musicService.textToMusic(prompt);

    if (!result.success) {
      await editMessage(
        chatId,
        statusMessageId,
        errorMessage(result.error || 'unknown', undefined, lang),
        { parse_mode: 'HTML' }
      );
      return;
    }

    const audio = await resolveAudioPayload(result);
    if (!audio) {
      await editMessage(chatId, statusMessageId, errorMessage('unknown', undefined, lang), {
        parse_mode: 'HTML',
      });
      return;
    }

    consumeMusicRateLimit(userId, maxMusicRequestsPerDay);

    const elapsed = Math.round((Date.now() - started) / 1000);
    const caption = `${t('musicGeneratedCaption')} <i>${escapeHtml(prompt.slice(0, 180))}</i>`;

    await editMessage(chatId, statusMessageId, t('musicDoneSending', { seconds: String(elapsed) }));
    logInfo('Sending audio to Telegram', { userId, bytes: audio.base64.length });
    await sendAudio(chatId, audio.base64, audio.mimeType, caption);
    await editMessage(chatId, statusMessageId, t('musicSent'));
  } catch (err) {
    logError('runMusicJob failed', err);
    await editMessage(
      chatId,
      statusMessageId,
      errorMessage('unknown', undefined, lang),
      { parse_mode: 'HTML' }
    ).catch(() => undefined);
  }
}

async function resolveAudioPayload(
  result: MusicResult
): Promise<{ base64: string; mimeType: string } | null> {
  if (result.audioBase64) {
    return {
      base64: result.audioBase64,
      mimeType: result.mimeType || 'audio/wav',
    };
  }
  if (result.audioUrl) {
    const buffer = await downloadBufferFromUrl(result.audioUrl);
    if (buffer.length === 0) return null;
    return {
      base64: buffer.toString('base64'),
      mimeType: result.mimeType || guessMimeFromUrl(result.audioUrl),
    };
  }
  return null;
}

function guessMimeFromUrl(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('.mp3')) return 'audio/mpeg';
  if (lower.includes('.ogg')) return 'audio/ogg';
  return 'audio/wav';
}
