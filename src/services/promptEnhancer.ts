// src/services/promptEnhancer.ts — text-only via the same image model (no extra paid models)

import { GoogleGenerativeAI } from '@google/generative-ai';
import { logInfo, logWarn } from '../utils/logger';

export class PromptEnhancer {
  private client: GoogleGenerativeAI;
  private modelId: string;

  constructor(apiKey: string, modelId: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.modelId = modelId;
  }

  async enhance(prompt: string, lang: 'ru' | 'en'): Promise<string> {
    if (prompt.length > 280) return prompt;

    const systemHint =
      lang === 'ru'
        ? 'Улучши описание для генерации изображения: добавь детали стиля, освещения, композиции. Ответь ТОЛЬКО улучшенным промптом на русском, без пояснений и без картинки. Максимум 2 предложения.'
        : 'Improve this image generation prompt: add style, lighting, and composition details. Reply ONLY with the improved prompt in English, no explanations and no image. Max 2 sentences.';

    try {
      const model = this.client.getGenerativeModel({
        model: this.modelId,
        generationConfig: {
          // @ts-ignore — request text output only
          responseModalities: ['Text'],
        },
      });
      const result = await model.generateContent(`${systemHint}\n\nPrompt: ${prompt}`);
      const text = result.response.text().trim();
      if (text.length > 10 && text.length < 600) {
        logInfo('Prompt enhanced', { model: this.modelId, original: prompt.slice(0, 60) });
        return text;
      }
    } catch (err) {
      logWarn('Prompt enhancement failed', err);
    }
    return prompt;
  }
}
