// src/services/rateLimitGuard.ts

import { checkRateLimit, checkVideoRateLimit, checkMusicRateLimit } from '../utils/rateLimit';
import { errorMessage } from '../utils/messages';
import type { Lang } from '../i18n';

export function assertRateLimit(
  userId: number,
  maxPerDay: number,
  lang: Lang
): { ok: true; remaining: number } | { ok: false; message: string } {
  const limit = checkRateLimit(userId, maxPerDay);
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
  const limit = checkVideoRateLimit(userId, maxPerDay);
  if (!limit.allowed) {
    return {
      ok: false,
      message: errorMessage('video_rate_limit', limit.resetIn, lang),
    };
  }
  return { ok: true, remaining: limit.remaining };
}

export function assertMusicRateLimit(
  userId: number,
  maxPerDay: number,
  lang: Lang
): { ok: true; remaining: number } | { ok: false; message: string } {
  const limit = checkMusicRateLimit(userId, maxPerDay);
  if (!limit.allowed) {
    return {
      ok: false,
      message: errorMessage('music_rate_limit', limit.resetIn, lang),
    };
  }
  return { ok: true, remaining: limit.remaining };
}
