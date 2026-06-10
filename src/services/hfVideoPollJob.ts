// HF Space video — poll loop inside waitUntil (no self-HTTP; avoids Vercel 508 infinite loop)

import { createTranslator, type Lang } from '../i18n';
import { createHfSpaceVideoApi } from './providers/hfSpaceVideoApi';
import { deliverVideoResult, type VideoJobParams } from './videoPipeline';
import type { HfSpaceVideoService } from './hfSpaceVideoService';
import { editMessage } from './telegramSender';
import { consumeHfVideoRateLimit } from '../utils/rateLimit';
import { downloadTelegramFile, bufferToBase64 } from '../utils/fileUtils';
import { errorMessage } from '../utils/messages';
import { logError, logInfo } from '../utils/logger';

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Poll HF Space until video is ready, within one Vercel waitUntil (no /api/video-poll self-calls). */
export async function runHfVideoPollLoop(job: HfVideoPollJob): Promise<void> {
  const loopStarted = Date.now();
  const maxAgeMs = parseInt(process.env.HF_VIDEO_TIMEOUT_MS || '600000', 10);
  const maxAttempts = parseInt(process.env.HF_VIDEO_MAX_POLL_ATTEMPTS || '60', 10);
  const pollIntervalMs = parseInt(process.env.HF_VIDEO_POLL_INTERVAL_MS || '5000', 10);
  /** Stay under api/telegram maxDuration (default 300s on Vercel Hobby + Fluid). */
  const vercelBudgetMs = parseInt(process.env.HF_VIDEO_VERCEL_BUDGET_MS || '280000', 10);

  const api = createHfSpaceVideoApi(job.spaceRaw);

  logInfo('HF video poll: loop started', {
    eventId: job.eventId,
    vercelBudgetSec: Math.round(vercelBudgetMs / 1000),
  });

  while (
    Date.now() - job.startedAt < maxAgeMs &&
    Date.now() - loopStarted < vercelBudgetMs &&
    job.attempts < maxAttempts
  ) {
    job.attempts += 1;

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
          videoService: {
            provider: 'hf_space',
            textToVideo: async () => videoResult,
            imageToVideo: async () => videoResult,
          },
          consumeRateLimit: consumeHfVideoRateLimit,
          t,
        };

        await deliverVideoResult(params, videoResult, job.startedAt);
        logInfo('HF video poll: completed', { eventId: job.eventId, attempts: job.attempts });
        return;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logError('HF video poll: tick failed', { eventId: job.eventId, message });
      if (!/sleeping|queue|503|loading|timeout|aborted/i.test(message)) {
        await failHfVideoPoll(job, 'hf_space_error');
        return;
      }
    }

    if (Date.now() - loopStarted + pollIntervalMs < vercelBudgetMs) {
      await sleep(pollIntervalMs);
    }
  }

  await failHfVideoPoll(job, 'hf_space_timeout');
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

    await runHfVideoPollLoop(job);
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
