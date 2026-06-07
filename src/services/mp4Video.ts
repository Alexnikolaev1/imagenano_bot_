// Resolve MP4 provider: HF Space takes priority over Colab

import type { AppContext } from '../context';
import type { VideoGenerator } from './videoGenerator';
import {
  assertColabVideoRateLimit,
  assertHfVideoRateLimit,
} from './rateLimitGuard';
import { consumeColabVideoRateLimit, consumeHfVideoRateLimit } from '../utils/rateLimit';
import type { Lang } from '../i18n';

export interface Mp4VideoBinding {
  service: VideoGenerator;
  maxPerDay: number;
  assertRateLimit: (
    userId: number,
    maxPerDay: number,
    lang: Lang
  ) => { ok: true; remaining: number } | { ok: false; message: string };
  consumeRateLimit: (userId: number, maxPerDay: number) => void;
  provider: 'hf_space' | 'colab';
}

export function resolveMp4Video(ctx: AppContext): Mp4VideoBinding | null {
  if (ctx.hfSpaceVideoService) {
    return {
      service: ctx.hfSpaceVideoService,
      maxPerDay: ctx.config.maxHfVideoRequestsPerDay,
      assertRateLimit: assertHfVideoRateLimit,
      consumeRateLimit: consumeHfVideoRateLimit,
      provider: 'hf_space',
    };
  }
  if (ctx.colabVideoService) {
    return {
      service: ctx.colabVideoService,
      maxPerDay: ctx.config.maxColabVideoRequestsPerDay,
      assertRateLimit: assertColabVideoRateLimit,
      consumeRateLimit: consumeColabVideoRateLimit,
      provider: 'colab',
    };
  }
  return null;
}
