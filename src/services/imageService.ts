// src/services/imageService.ts — Cloudflare Workers AI (Flux Schnell + Flux Klein for edits)

import { GenerationResult } from '../types';
import { PromptEnhancer } from './promptEnhancer';
import { resizeForCloudflareInput } from '../utils/imageResize';
import {
  normalizeEditModel,
  normalizeGenerateModel,
  parseCloudflareError,
  requiresMultipart,
} from '../utils/cloudflareModel';
import { logError, logInfo, notifyAdmin } from '../utils/logger';

export interface ImageServiceConfig {
  accountId: string;
  apiToken: string;
  /** Text-to-image (fast, cheap) */
  generateModel: string;
  /** Image + prompt editing (multipart) */
  editModel: string;
  enhancer?: PromptEnhancer;
}

interface CloudflareAiResponse {
  result?: { image?: string };
  success?: boolean;
  errors?: Array<{ code?: number; message?: string }>;
  messages?: unknown[];
}

export class ImageService {
  private accountId: string;
  private apiToken: string;
  private generateModel: string;
  private editModel: string;
  private enhancer?: PromptEnhancer;

  constructor(config: ImageServiceConfig) {
    this.accountId = config.accountId;
    this.apiToken = config.apiToken;
    this.generateModel = normalizeGenerateModel(config.generateModel);
    this.editModel = normalizeEditModel(config.editModel);
    this.enhancer = config.enhancer;
  }

  getEnhancer(): PromptEnhancer | undefined {
    return this.enhancer;
  }

  async generateImage(prompt: string): Promise<GenerationResult> {
    logInfo('Generating image', { model: this.generateModel, prompt: prompt.slice(0, 100) });

    try {
      if (requiresMultipart(this.generateModel)) {
        return await this.runMultipart(this.generateModel, prompt.slice(0, 2048));
      }

      const res = await fetch(this.modelUrl(this.generateModel), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt.slice(0, 2048), steps: 4 }),
      });

      return this.parseResponse(res, 'generate');
    } catch (error) {
      return this.failFromException(error, 'generate');
    }
  }

  async editImage(imageBase64: string, _mimeType: string, instruction: string): Promise<GenerationResult> {
    const trimmed = instruction.trim();
    if (!trimmed) {
      return { success: false, error: 'need_instruction' };
    }

    try {
      const imageBuffer = await resizeForCloudflareInput(imageBase64);
      const prompt = `${trimmed}. Keep image 0 as the base reference.`;
      logInfo('Editing image', { model: this.editModel, instruction: trimmed.slice(0, 100) });
      return await this.runMultipart(this.editModel, prompt, imageBuffer);
    } catch (error) {
      return this.failFromException(error, 'edit');
    }
  }

  async variateImage(imageBase64: string, _mimeType: string): Promise<GenerationResult> {
    try {
      const imageBuffer = await resizeForCloudflareInput(imageBase64);
      const prompt =
        'Create a creative variation of image 0, keeping the same subject and overall composition.';
      logInfo('Creating variation', { model: this.editModel });
      return await this.runMultipart(this.editModel, prompt, imageBuffer);
    } catch (error) {
      return this.failFromException(error, 'variation');
    }
  }

  private async runMultipart(
    model: string,
    prompt: string,
    inputImage?: Buffer
  ): Promise<GenerationResult> {
    const form = new FormData();
    form.append('prompt', prompt.slice(0, 2048));
    form.append('width', '768');
    form.append('height', '432');

    if (inputImage) {
      form.append('input_image_0', new Blob([inputImage], { type: 'image/jpeg' }), 'input.jpg');
    }

    const res = await fetch(this.modelUrl(model), {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiToken}` },
      body: form,
    });

    return this.parseResponse(res, inputImage ? 'multipart' : 'generate-multipart');
  }

  private async parseResponse(
    res: Response,
    kind: string
  ): Promise<GenerationResult> {
    if (!res.ok) {
      return this.handleHttpError(res.status, await safeText(res));
    }

    const data = (await res.json()) as CloudflareAiResponse;

    if (data.success === false) {
      const message = data.errors?.map((e) => e.message).join('; ') || 'unknown error';
      logError(`Cloudflare AI ${kind} failure`, { errors: data.errors });
      return { success: false, error: parseCloudflareError(400, JSON.stringify(data)) };
    }

    const base64 = data.result?.image;
    if (!base64) {
      return { success: false, error: 'No image data found in the Cloudflare response.' };
    }

    logInfo(`Cloudflare ${kind} succeeded`, { model: kind });
    return { success: true, imageData: base64, mimeType: 'image/jpeg' };
  }

  private failFromException(error: unknown, kind: string): GenerationResult {
    const message = error instanceof Error ? error.message : String(error);
    logError(`Cloudflare AI ${kind} request failed`, { message });
    notifyAdmin(`Cloudflare AI ${kind} failed: ${message}`);
    return { success: false, error: message };
  }

  private modelUrl(model: string): string {
    return `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${model}`;
  }

  private handleHttpError(status: number, body: string): GenerationResult {
    logError('Cloudflare AI HTTP error', { status, body: body.slice(0, 300) });

    const code = parseCloudflareError(status, body);
    if (code === 'auth_error') {
      notifyAdmin(`Cloudflare AI auth error (${status}): ${body.slice(0, 200)}`);
    }
    return { success: false, error: code };
  }
}

async function safeText(res: { text: () => Promise<string> }): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}
