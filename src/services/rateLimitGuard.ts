// src/services/rateLimitGuard.ts

import {
  peekRateLimit,
  peekVideoRateLimit,
  peekVideoGifRateLimit,
  peekColabVideoRateLimit,
  peekMusicRateLimit,
} from '../utils/rateLimit';
import { errorMessage } from '../utils/messages';
import type { Lang } from '../i18n';

export function assertRateLimit(
  userId: number,
  maxPerDay: number,
  lang: Lang
): { ok: true; remaining: number } | { ok: false; message: string } {
  const limit = peekRateLimit(userId, maxPerDay);
  if (!limit.allowed) {
    return {
      ok: false,
      message: errorMessage('user_rate_limit', limit.resetIn, lang),
    };
  }
  return { ok: true, remaining: limit.remaining };
}

export function assertVideoRateLimit(
  userId: number,
  maxPerDay: number,
  lang: Lang
): { ok: true; remaining: number } | { ok: false; message: string } {
  const limit = peekVideoRateLimit(userId, maxPerDay);
  if (!limit.allowed) {
    return {
      ok: false,
      message: errorMessage('video_rate_limit', limit.resetIn, lang),
    };
  }
  return { ok: true, remaining: limit.remaining };
}

export function assertVideoGifRateLimit(
  userId: number,
  maxPerDay: number,
  lang: Lang
): { ok: true; remaining: number } | { ok: false; message: string } {
  const limit = peekVideoGifRateLimit(userId, maxPerDay);
  if (!limit.allowed) {
    return {
      ok: false,
      message: errorMessage('video_gif_rate_limit', limit.resetIn, lang),
    };
  }
  return { ok: true, remaining: limit.remaining };
}

export function assertColabVideoRateLimit(
  userId: number,
  maxPerDay: number,
  lang: Lang
): { ok: true; remaining: number } | { ok: false; message: string } {
  const limit = peekColabVideoRateLimit(userId, maxPerDay);
  if (!limit.allowed) {
    return {
      ok: false,
      message: errorMessage('colab_video_rate_limit', limit.resetIn, lang),
    };
  }
  return { ok: true, remaining: limit.remaining };
}

export function assertMusicRateLimit(
  userId: number,
  maxPerDay: number,
  lang: Lang
): { ok: true; remaining: number } | { ok: false; message: string } {
  const limit = peekMusicRateLimit(userId, maxPerDay);
  if (!limit.allowed) {
    return {
      ok: false,
      message: errorMessage('music_rate_limit', limit.resetIn, lang),
    };
  }
  return { ok: true, remaining: limit.remaining };
}
