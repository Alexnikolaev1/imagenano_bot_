// HF Space LTX-Video — submit + chained poll (see hfVideoPollJob.ts)

import type { AppConfig } from '../config';
import type { VideoGenerator } from './videoGenerator';
import { HfSpaceVideoApiClient, createHfSpaceVideoApi } from './providers/hfSpaceVideoApi';
import type { VideoResult } from '../types';
import { logInfo } from '../utils/logger';

export type HfSubmitResult =
  | { success: true; eventId: string }
  | { success: false; error: string };

export class HfSpaceVideoService implements VideoGenerator {
  readonly provider = 'hf_space';

  constructor(
    private api: HfSpaceVideoApiClient,
    readonly spaceId: string
  ) {}

  /** Sync path unused on Vercel — pipeline calls submit* + poll chain instead. */
  async textToVideo(prompt: string): Promise<VideoResult> {
    const submit = await this.submitTextToVideo(prompt);
    if (!submit.success) return { success: false, error: submit.error };
    return { success: false, error: 'hf_space_internal' };
  }

  async imageToVideo(prompt: string, imageBase64: string, mimeType: string): Promise<VideoResult> {
    const submit = await this.submitImageToVideo(prompt, imageBase64, mimeType);
    if (!submit.success) return { success: false, error: submit.error };
    return { success: false, error: 'hf_space_internal' };
  }

  async submitTextToVideo(prompt: string): Promise<HfSubmitResult> {
    logInfo('HF Space video: text submit', { prompt: prompt.slice(0, 80) });
    try {
      const eventId = await this.api.submitGeneration(prompt);
      return { success: true, eventId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: mapSubmitError(message) };
    }
  }

  async submitImageToVideo(
    prompt: string,
    imageBase64: string,
    mimeType: string
  ): Promise<HfSubmitResult> {
    const buffer = Buffer.from(imageBase64, 'base64');
    if (buffer.length === 0) return { success: false, error: 'hf_space_upload_failed' };

    logInfo('HF Space video: uploading reference image', { bytes: buffer.length, mimeType });
    const imageUrl = await this.api.uploadImage(buffer, mimeType);
    if (!imageUrl) return { success: false, error: 'hf_space_upload_failed' };

    try {
      const eventId = await this.api.submitGeneration(prompt, imageUrl);
      return { success: true, eventId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: mapSubmitError(message) };
    }
  }
}

function mapSubmitError(message: string): string {
  if (
    message === 'hf_auth_error' ||
    message === 'hf_space_sleeping' ||
    message === 'hf_space_bad_response' ||
    message === 'rate_limit'
  ) {
    return message;
  }
  if (/timeout|aborted/i.test(message)) return 'hf_space_timeout';
  if (/sleeping|queue|503|loading/i.test(message)) return 'hf_space_sleeping';
  return message.slice(0, 200) || 'hf_space_error';
}

export function createHfSpaceVideoService(config: AppConfig): HfSpaceVideoService | null {
  if (!config.hfVideoEnabled || !config.hfVideoSpace) return null;
  return new HfSpaceVideoService(createHfSpaceVideoApi(config.hfVideoSpace), config.hfVideoSpace);
}
