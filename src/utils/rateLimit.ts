// src/utils/rateLimit.ts
import fs from 'fs';
import { UserRateLimit } from '../types';
import { dataFile } from './paths';

const RATE_LIMIT_FILE = dataFile('rate_limits.json');
const DAY_MS = 24 * 60 * 60 * 1000;

function loadLimits(): Record<string, UserRateLimit> {
  try {
    if (fs.existsSync(RATE_LIMIT_FILE)) {
      const raw = fs.readFileSync(RATE_LIMIT_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {
    // ignore parse errors
  }
  return {};
}

function saveLimits(limits: Record<string, UserRateLimit>): void {
  try {
    fs.writeFileSync(RATE_LIMIT_FILE, JSON.stringify(limits));
  } catch {
    // /tmp might not be writable in all environments
  }
}

function checkRateLimitKeyed(key: string, maxPerDay: number, consume: boolean): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  const limits = loadLimits();
  const now = Date.now();

  let userLimit = limits[key];

  if (!userLimit || now >= userLimit.resetAt) {
    userLimit = { count: 0, resetAt: now + DAY_MS };
  }

  const allowed = userLimit.count < maxPerDay;
  const remaining = Math.max(0, maxPerDay - userLimit.count);
  const resetIn = Math.ceil((userLimit.resetAt - now) / 1000);

  if (allowed && consume) {
    userLimit.count += 1;
    limits[key] = userLimit;
    saveLimits(limits);
  }

  return { allowed, remaining: allowed && consume ? remaining - 1 : remaining, resetIn };
}

function getRateLimitInfoKeyed(key: string, maxPerDay: number): {
  used: number;
  remaining: number;
  resetIn: number;
} {
  const limits = loadLimits();
  const now = Date.now();
  const userLimit = limits[key];

  if (!userLimit || now >= userLimit.resetAt) {
    return { used: 0, remaining: maxPerDay, resetIn: 0 };
  }

  return {
    used: userLimit.count,
    remaining: Math.max(0, maxPerDay - userLimit.count),
    resetIn: Math.ceil((userLimit.resetAt - now) / 1000),
  };
}

export function checkRateLimit(userId: number, maxPerDay: number): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  return checkRateLimitKeyed(String(userId), maxPerDay, true);
}

export function peekRateLimit(userId: number, maxPerDay: number): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  return checkRateLimitKeyed(String(userId), maxPerDay, false);
}

export function consumeRateLimit(userId: number, maxPerDay: number): void {
  checkRateLimitKeyed(String(userId), maxPerDay, true);
}

export function checkVideoRateLimit(userId: number, maxPerDay: number): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  return checkRateLimitKeyed(`video:${userId}`, maxPerDay, true);
}

export function peekVideoRateLimit(userId: number, maxPerDay: number): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  return checkRateLimitKeyed(`video:${userId}`, maxPerDay, false);
}

export function consumeVideoRateLimit(userId: number, maxPerDay: number): void {
  checkRateLimitKeyed(`video:${userId}`, maxPerDay, true);
}

export function getRateLimitInfo(userId: number, maxPerDay: number): {
  used: number;
  remaining: number;
  resetIn: number;
} {
  return getRateLimitInfoKeyed(String(userId), maxPerDay);
}

export function getVideoRateLimitInfo(userId: number, maxPerDay: number): {
  used: number;
  remaining: number;
  resetIn: number;
} {
  return getRateLimitInfoKeyed(`video:${userId}`, maxPerDay);
}

export function checkMusicRateLimit(userId: number, maxPerDay: number): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  return checkRateLimitKeyed(`music:${userId}`, maxPerDay, true);
}

export function peekMusicRateLimit(userId: number, maxPerDay: number): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  return checkRateLimitKeyed(`music:${userId}`, maxPerDay, false);
}

export function consumeMusicRateLimit(userId: number, maxPerDay: number): void {
  checkRateLimitKeyed(`music:${userId}`, maxPerDay, true);
}

export function getMusicRateLimitInfo(userId: number, maxPerDay: number): {
  used: number;
  remaining: number;
  resetIn: number;
} {
  return getRateLimitInfoKeyed(`music:${userId}`, maxPerDay);
}
