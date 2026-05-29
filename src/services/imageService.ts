// src/services/imageService.ts — image generation via Cloudflare Workers AI (Flux Schnell)

import { GenerationResult } from '../types';
import { PromptEnhancer } from './promptEnhancer';
import { logError, logInfo, notifyAdmin } from '../utils/logger';

export interface ImageServiceConfig {
  accountId: string;
  apiToken: string;
  model: string;
  /** Optional Gemini-based prompt enhancer (text only) */
  enhancer?: PromptEnhancer;
}

interface CloudflareAiResponse {
  result?: { image?: string };
  success?: boolean;
  errors?: Array<{ code?: number; message?: string }>;
  messages?: unknown[];
}

/**
 * Flux Schnell is text-to-image only: it cannot edit an existing photo or
 * build variations from an input image. Those operations return an
 * "unsupported" result so the UI can show a clear message.
 */
export class ImageService {
  private accountId: string;
  private apiToken: string;
  private model: string;
  private enhancer?: PromptEnhancer;

  constructor(config: ImageServiceConfig) {
    this.accountId = config.accountId;
    this.apiToken = config.apiToken;
    this.model = config.model;
    this.enhancer = config.enhancer;
  }

  getEnhancer(): PromptEnhancer | undefined {
    return this.enhancer;
  }

  async generateImage(prompt: string): Promise<GenerationResult> {
    logInfo('Generating image', { model: this.model, prompt: prompt.slice(0, 100) });

    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${this.model}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt.slice(0, 2048), steps: 6 }),
      });

      if (!res.ok) {
        return this.handleHttpError(res.status, await safeText(res));
      }

      const data = (await res.json()) as CloudflareAiResponse;

      if (data.success === false) {
        const message = data.errors?.map((e) => e.message).join('; ') || 'unknown error';
        logError('Cloudflare AI returned failure', { errors: data.errors });
        return { success: false, error: message };
      }

      const base64 = data.result?.image;
      if (!base64) {
        return { success: false, error: 'No image data found in the Cloudflare response.' };
      }

      logInfo('Successfully generated image via Cloudflare');
      return { success: true, imageData: base64, mimeType: 'image/jpeg' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logError('Cloudflare AI request failed', { message });
      notifyAdmin(`Cloudflare AI request failed: ${message}`);
      return { success: false, error: message };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async editImage(_imageBase64: string, _mimeType: string, _instruction: string): Promise<GenerationResult> {
    return { success: false, error: 'edit_unsupported' };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async variateImage(_imageBase64: string, _mimeType: string): Promise<GenerationResult> {
    return { success: false, error: 'edit_unsupported' };
  }

  private handleHttpError(status: number, body: string): GenerationResult {
    logError('Cloudflare AI HTTP error', { status, body: body.slice(0, 300) });

    if (status === 429) {
      return { success: false, error: 'rate_limit' };
    }
    if (status === 401 || status === 403) {
      notifyAdmin(`Cloudflare AI auth error (${status}): ${body.slice(0, 200)}`);
      return { success: false, error: 'auth_error' };
    }
    return { success: false, error: `Cloudflare AI error ${status}` };
  }
}

async function safeText(res: { text: () => Promise<string> }): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}
