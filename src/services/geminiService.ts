// src/services/geminiService.ts — all image ops use one model (gemini-2.5-flash-image)

import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { GenerationResult } from '../types';
import { PromptEnhancer } from './promptEnhancer';
import { logError, logInfo, notifyAdmin } from '../utils/logger';

export class GeminiService {
  private client: GoogleGenerativeAI;
  private imageModelId: string;
  private enhancer: PromptEnhancer;
  private enhanceEnabled: boolean;

  constructor(apiKey: string, imageModelId: string, enhanceEnabled = true) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.imageModelId = imageModelId;
    this.enhancer = new PromptEnhancer(apiKey, imageModelId);
    this.enhanceEnabled = enhanceEnabled;
  }

  getEnhancer(): PromptEnhancer | undefined {
    return this.enhanceEnabled ? this.enhancer : undefined;
  }

  private imageModel() {
    return this.client.getGenerativeModel({
      model: this.imageModelId,
      generationConfig: {
        // @ts-ignore — responseModalities is experimental
        responseModalities: ['Text', 'Image'],
      },
    });
  }

  async generateImage(prompt: string): Promise<GenerationResult> {
    logInfo('Generating image', { model: this.imageModelId, prompt: prompt.slice(0, 100) });

    try {
      const result = await this.imageModel().generateContent(prompt);
      return this.extractImageFromResponse(result);
    } catch (error) {
      return this.handleApiError(error, 'generateImage');
    }
  }

  async editImage(
    imageBase64: string,
    mimeType: string,
    instruction: string
  ): Promise<GenerationResult> {
    logInfo('Editing image', { model: this.imageModelId, instruction: instruction.slice(0, 100) });

    try {
      const parts: Part[] = [
        {
          inlineData: {
            mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: imageBase64,
          },
        },
        {
          text: `Edit this image: ${instruction}. Return the modified image.`,
        },
      ];

      const result = await this.imageModel().generateContent({ contents: [{ role: 'user', parts }] });
      return this.extractImageFromResponse(result);
    } catch (error) {
      return this.handleApiError(error, 'editImage');
    }
  }

  /** Single request to the image model — no separate vision/text model */
  async variateImage(imageBase64: string, mimeType: string): Promise<GenerationResult> {
    logInfo('Generating image variation', { model: this.imageModelId });

    try {
      const parts: Part[] = [
        {
          inlineData: {
            mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: imageBase64,
          },
        },
        {
          text:
            'Create a creative variation of this image — keep the same subject and composition, ' +
            'but change style, lighting, or color palette so it feels related yet visually distinct. ' +
            'Return only the new image.',
        },
      ];

      const result = await this.imageModel().generateContent({ contents: [{ role: 'user', parts }] });
      return this.extractImageFromResponse(result);
    } catch (error) {
      return this.handleApiError(error, 'variateImage');
    }
  }

  private extractImageFromResponse(result: {
    response: {
      candidates?: Array<{
        content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string }; text?: string }> };
      }>;
      text: () => string;
    };
  }): GenerationResult {
    const candidates = result.response.candidates;

    if (!candidates || candidates.length === 0) {
      return {
        success: false,
        error: 'No candidates returned from the API. The model may have refused the request.',
      };
    }

    const parts = candidates[0]?.content?.parts || [];

    for (const part of parts) {
      if (part.inlineData?.data && part.inlineData?.mimeType) {
        logInfo('Successfully extracted image from response');
        return {
          success: true,
          imageData: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
        };
      }
    }

    const textParts = parts.filter((p) => p.text);
    if (textParts.length > 0) {
      const text = textParts.map((p) => p.text).join(' ');
      logError('API returned text instead of image', { text });
      return {
        success: false,
        error: `The model returned text instead of an image: "${text.slice(0, 200)}"`,
      };
    }

    return {
      success: false,
      error: 'No image data found in the API response.',
    };
  }

  private handleApiError(error: unknown, context: string): GenerationResult {
    const err = error as { status?: number; message?: string; toString?: () => string };
    const message = err?.message || String(error);
    const status = err?.status;

    logError(`Gemini API error in ${context}`, { status, message, model: this.imageModelId });

    if (status === 429 || message.includes('429') || message.toLowerCase().includes('quota')) {
      return { success: false, error: 'rate_limit' };
    }

    if (status === 401 || status === 403) {
      notifyAdmin(`API key error in ${context}: ${message}`);
      return { success: false, error: 'auth_error' };
    }

    if (message.toLowerCase().includes('safety') || message.toLowerCase().includes('blocked')) {
      return { success: false, error: 'safety_block' };
    }

    notifyAdmin(`Unexpected error in ${context}: ${message}`);
    return { success: false, error: message };
  }
}
