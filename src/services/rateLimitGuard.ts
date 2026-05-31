// src/services/rateLimitGuard.ts

import {
  peekRateLimit,
  peekVideoRateLimit,
  peekVideoGifRateLimit,
  peekFalVideoRateLimit,
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

export function assertFalVideoRateLimit(
  userId: number,
  maxPerDay: number,
  lang: Lang
): { ok: true; remaining: number } | { ok: false; message: string } {
  const limit = peekFalVideoRateLimit(userId, maxPerDay);
  if (!limit.allowed) {
    return {
      ok: false,
      message: errorMessage('fal_video_rate_limit', limit.resetIn, lang),
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
