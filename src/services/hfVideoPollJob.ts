// HF Space video — chained short polls across Vercel invocations (beats 5 min limit)

import { createTranslator, type Lang } from '../i18n';
import { createHfSpaceVideoApi } from './providers/hfSpaceVideoApi';
import { deliverVideoResult, type VideoJobParams } from './videoPipeline';
import type { HfSpaceVideoService } from './hfSpaceVideoService';
import { editMessage } from './telegramSender';
import { consumeHfVideoRateLimit } from '../utils/rateLimit';
import { downloadTelegramFile, bufferToBase64 } from '../utils/fileUtils';
import { errorMessage } from '../utils/messages';
import { logError, logInfo, logWarn } from '../utils/logger';

export interface HfVideoPollJob {
  eventId: string;
  spaceRaw: string;
  chatId: number;
  statusMessageId: number;
  userId: number;
  prompt: string;
  jobType: 'text' | 'image';
  lang: Lang;
  maxPerDay: number;
  startedAt: number;
  attempts: number;
}

function getPollSecret(): string {
  return (
    process.env.VIDEO_POLL_SECRET?.trim() ||
    process.env.TELEGRAM_BOT_TOKEN?.trim() ||
    ''
  );
}

function getVercelProtectionBypass(): string | undefined {
  return (
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() ||
    process.env.VERCEL_PROTECTION_BYPASS?.trim() ||
    undefined
  );
}

function buildPollRequestHeaders(secret: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-video-poll-secret': secret,
  };
  const bypass = getVercelProtectionBypass();
  if (bypass) {
    headers['x-vercel-protection-bypass'] = bypass;
  }
  return headers;
}

function getAppBaseUrl(): string {
  const raw = process.env.VERCEL_URL?.trim() || process.env.APP_BASE_URL?.trim();
  if (!raw) return `http://127.0.0.1:${process.env.PORT || '3000'}`;
  return raw.startsWith('http') ? raw.replace(/\/+$/, '') : `https://${raw}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function scheduleHfVideoPoll(job: HfVideoPollJob): Promise<boolean> {
  const secret = getPollSecret();
  if (!secret) {
    logError('HF video poll: missing VIDEO_POLL_SECRET / TELEGRAM_BOT_TOKEN');
    return false;
  }

  const bypass = getVercelProtectionBypass();
  if (!bypass) {
    logWarn(
      'HF video poll: VERCEL_AUTOMATION_BYPASS_SECRET not set — self-calls may be blocked by Deployment Protection'
    );
  }

  const delayMs = parseInt(process.env.HF_VIDEO_POLL_INTERVAL_MS || '5000', 10);
  if (job.attempts > 0 && delayMs > 0) await sleep(delayMs);

  let url = `${getAppBaseUrl()}/api/video-poll`;
  if (bypass) {
    url += `?x-vercel-protection-bypass=${encodeURIComponent(bypass)}`;
  }

  logInfo('HF video poll: scheduling next invocation', {
    eventId: job.eventId,
    attempt: job.attempts + 1,
    url: url.replace(/x-vercel-protection-bypass=[^&]+/, 'x-vercel-protection-bypass=***'),
    hasBypass: Boolean(bypass),
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: buildPollRequestHeaders(secret),
      body: JSON.stringify(job),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logError('HF video poll: schedule failed', { status: res.status, body: text.slice(0, 200) });
      if (res.status === 401 && /authentication required/i.test(text)) {
        await failHfVideoPoll(job, 'vercel_protection_blocked');
      }
      return false;
    }
    return true;
  } catch (err) {
    logError('HF video poll: schedule fetch error', err);
    return false;
  }
}

export async function processHfVideoPollJob(job: HfVideoPollJob): Promise<void> {
  const maxAgeMs = parseInt(process.env.HF_VIDEO_TIMEOUT_MS || '600000', 10);
  const maxAttempts = parseInt(process.env.HF_VIDEO_MAX_POLL_ATTEMPTS || '60', 10);

  if (Date.now() - job.startedAt > maxAgeMs) {
    await failHfVideoPoll(job, 'hf_space_timeout');
    return;
  }
  if (job.attempts >= maxAttempts) {
    await failHfVideoPoll(job, 'hf_space_timeout');
    return;
  }

  job.attempts += 1;
  const api = createHfSpaceVideoApi(job.spaceRaw);

  logInfo('HF video poll: tick', {
    eventId: job.eventId,
    attempt: job.attempts,
    elapsedSec: Math.round((Date.now() - job.startedAt) / 1000),
  });

  try {
    const poll = await api.pollOnce(job.eventId);

    if (poll.status === 'error') {
      await failHfVideoPoll(job, poll.error || 'hf_space_error');
      return;
    }

    if (poll.status === 'complete' && poll.output !== undefined) {
      const videoResult = await api.downloadVideoOutput(poll.output);
      if (!videoResult.success) {
        await failHfVideoPoll(job, videoResult.error || 'hf_space_no_video');
        return;
      }

      const t = createTranslator(job.lang);
      const params: VideoJobParams = {
        chatId: job.chatId,
        statusMessageId: job.statusMessageId,
        userId: job.userId,
        type: job.jobType,
        kind: 'mp4',
        prompt: job.prompt,
        lang: job.lang,
        maxPerDay: job.maxPerDay,
        videoService: { provider: 'hf_space', textToVideo: async () => videoResult, imageToVideo: async () => videoResult },
        consumeRateLimit: consumeHfVideoRateLimit,
        t,
      };

      await deliverVideoResult(params, videoResult, job.startedAt);
      logInfo('HF video poll: completed', { eventId: job.eventId, attempts: job.attempts });
      return;
    }

    const scheduled = await scheduleHfVideoPoll(job);
    if (!scheduled) {
      logError('HF video poll: chain stopped', { eventId: job.eventId });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logError('HF video poll: tick failed', { eventId: job.eventId, message });
    if (/sleeping|queue|503|loading/i.test(message)) {
      await scheduleHfVideoPoll(job).catch(() => undefined);
      return;
    }
    await failHfVideoPoll(job, message.includes('timeout') ? 'hf_space_timeout' : 'hf_space_error');
  }
}

async function failHfVideoPoll(job: HfVideoPollJob, errorCode: string): Promise<void> {
  logInfo('HF video poll: failed', { eventId: job.eventId, errorCode, attempts: job.attempts });
  await editMessage(
    job.chatId,
    job.statusMessageId,
    errorMessage(errorCode, undefined, job.lang),
    { parse_mode: 'HTML' }
  ).catch((err) => logError('HF video poll: could not edit status', err));
}

export async function startHfSpaceVideoJob(
  params: VideoJobParams,
  service: HfSpaceVideoService
): Promise<void> {
  const startedAt = Date.now();
  const spaceRaw = service.spaceId;

  try {
    let eventId: string | undefined;

    if (params.type === 'text') {
      logInfo('HF Space video: submit text', {
        userId: params.userId,
        prompt: params.prompt.slice(0, 80),
      });
      const submit = await service.submitTextToVideo(params.prompt);
      if (!submit.success) {
        await editMessage(
          params.chatId,
          params.statusMessageId,
          errorMessage(submit.error || 'unknown', undefined, params.lang),
          { parse_mode: 'HTML' }
        );
        return;
      }
      eventId = submit.eventId;
    } else {
      const token = process.env.TELEGRAM_BOT_TOKEN!;
      const fileId = params.fileId;
      if (!fileId) throw new Error('fileId required for image-to-video');

      const { data, mimeType } = await downloadTelegramFile(token, fileId);
      const base64 = bufferToBase64(data);
      logInfo('HF Space video: submit image', { userId: params.userId, prompt: params.prompt.slice(0, 80) });
      const submit = await service.submitImageToVideo(params.prompt, base64, mimeType);
      if (!submit.success) {
        await editMessage(
          params.chatId,
          params.statusMessageId,
          errorMessage(submit.error || 'unknown', undefined, params.lang),
          { parse_mode: 'HTML' }
        );
        return;
      }
      eventId = submit.eventId;
    }

    const job: HfVideoPollJob = {
      eventId: eventId!,
      spaceRaw,
      chatId: params.chatId,
      statusMessageId: params.statusMessageId,
      userId: params.userId,
      prompt: params.prompt,
      jobType: params.type,
      lang: params.lang,
      maxPerDay: params.maxPerDay,
      startedAt,
      attempts: 0,
    };

    await scheduleHfVideoPoll(job);
  } catch (err) {
    logError('startHfSpaceVideoJob failed', err);
    await editMessage(
      params.chatId,
      params.statusMessageId,
      errorMessage('unknown', undefined, params.lang),
      { parse_mode: 'HTML' }
    ).catch(() => undefined);
  }
}

export function isValidPollSecret(header: string | string[] | undefined): boolean {
  const expected = getPollSecret();
  if (!expected) return false;
  const value = Array.isArray(header) ? header[0] : header;
  return value === expected;
}
