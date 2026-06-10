// HF Space LTX-Video — text/image-to-video via Gradio API

import type { AppConfig } from '../config';
import type { VideoGenerator } from './videoGenerator';
import { HfSpaceVideoApiClient, createHfSpaceVideoApi } from './providers/hfSpaceVideoApi';
import type { VideoResult } from '../types';
import { logInfo } from '../utils/logger';

export class HfSpaceVideoService implements VideoGenerator {
  readonly provider = 'hf_space';

  constructor(private api: HfSpaceVideoApiClient) {}

  async textToVideo(prompt: string): Promise<VideoResult> {
    logInfo('HF Space video: text-to-video', { prompt: prompt.slice(0, 80) });
    return this.api.generateFromPrompt(prompt);
  }

  async imageToVideo(prompt: string, imageBase64: string, mimeType: string): Promise<VideoResult> {
    const buffer = Buffer.from(imageBase64, 'base64');
    if (buffer.length === 0) return { success: false, error: 'hf_space_upload_failed' };

    logInfo('HF Space video: uploading reference image', { bytes: buffer.length, mimeType });
    const imageUrl = await this.api.uploadImage(buffer, mimeType);
    if (!imageUrl) return { success: false, error: 'hf_space_upload_failed' };

    return this.api.generateFromPrompt(prompt, imageUrl);
  }
}

export function createHfSpaceVideoService(config: AppConfig): HfSpaceVideoService | null {
  if (!config.hfVideoEnabled || !config.hfVideoSpace) return null;
  return new HfSpaceVideoService(createHfSpaceVideoApi(config.hfVideoSpace));
}
