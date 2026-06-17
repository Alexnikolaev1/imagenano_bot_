// HF Space video — one long Gradio SSE wait inside waitUntil (Vercel ~300s budget)

import { createTranslator } from '../i18n';
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
  lang: import('../i18n').Lang;
  maxPerDay: number;
  startedAt: number;
  attempts: number;
}

export async function runHfVideoPollLoop(job: HfVideoPollJob): Promise<void> {
  const vercelBudgetMs = parseInt(process.env.HF_VIDEO_VERCEL_BUDGET_MS || '285000', 10);
  const api = createHfSpaceVideoApi(job.spaceRaw);

  logInfo('HF video poll: waiting on Gradio SSE', {
    eventId: job.eventId,
    budgetSec: Math.round(vercelBudgetMs / 1000),
  });

  try {
    const poll = await api.pollUntilReady(job.eventId, vercelBudgetMs);

    if (poll.status === 'error') {
      await failHfVideoPoll(job, poll.error || 'hf_space_error');
      return;
    }

    if (poll.status !== 'complete' || poll.output === undefined) {
      await failHfVideoPoll(job, 'hf_space_timeout');
      return;
    }

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
    logInfo('HF video poll: completed', {
      eventId: job.eventId,
      elapsedSec: Math.round((Date.now() - job.startedAt) / 1000),
    });
  } catch (err) {
    logError('HF video poll loop failed', err);
    await failHfVideoPoll(job, 'hf_space_error');
  }
}

async function failHfVideoPoll(job: HfVideoPollJob, errorCode: string): Promise<void> {
  logInfo('HF video poll: failed', {
    eventId: job.eventId,
    errorCode,
    elapsedSec: Math.round((Date.now() - job.startedAt) / 1000),
  });
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

    await runHfVideoPollLoop({
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
    });
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
