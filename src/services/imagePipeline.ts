// src/services/imagePipeline.ts — unified async image job (webhook-safe)

import { GeminiService } from './geminiService';
import { PromptEnhancer } from './promptEnhancer';
import { sendPhoto, editMessage } from './telegramSender';
import { downloadTelegramFile, bufferToBase64 } from '../utils/fileUtils';
import { buildResultKeyboard } from '../utils/keyboards';
import { errorMessage, escapeHtml } from '../utils/messages';
import { applyStyleToPrompt } from '../i18n';
import { storePrompt } from '../storage/promptStore';
import { logError, logInfo } from '../utils/logger';
import type { TranslateFn } from '../context';
import type { Lang } from '../i18n';

export type ImageJobType = 'generate' | 'edit' | 'variation';

export interface ImageJobParams {
  chatId: number;
  statusMessageId: number;
  userId: number;
  type: ImageJobType;
  prompt?: string;
  fileId?: string;
  mimeType?: string;
  instruction?: string;
  styleKey?: string;
  lang: Lang;
  enhance: boolean;
  gemini: GeminiService;
  enhancer?: PromptEnhancer;
  t: TranslateFn;
}

export async function runImageJob(params: ImageJobParams): Promise<void> {
  const {
    chatId,
    statusMessageId,
    userId,
    type,
    gemini,
    enhancer,
    t,
    lang,
    enhance,
  } = params;

  try {
    let result;

    if (type === 'generate') {
      let prompt = params.prompt?.trim() ?? '';
      if (!prompt) {
        await editMessage(chatId, statusMessageId, t('needPrompt'), { parse_mode: 'HTML' });
        return;
      }

      prompt = applyStyleToPrompt(prompt, params.styleKey);

      if (enhance && enhancer && prompt.length < 280) {
        const enhanced = await enhancer.enhance(prompt, lang);
        if (enhanced !== prompt) {
          prompt = enhanced;
        }
      }

      logInfo('Image job: generate', { userId, prompt: prompt.slice(0, 80) });
      result = await gemini.generateImage(prompt);
      params.prompt = prompt;
    } else {
      const token = process.env.TELEGRAM_BOT_TOKEN!;
      const fileId = params.fileId;
      if (!fileId) throw new Error('fileId required for edit/variation');

      const { data, mimeType } = await downloadTelegramFile(token, fileId);
      const base64 = bufferToBase64(data);

      if (type === 'edit') {
        const instruction = params.instruction?.trim() ?? '';
        if (!instruction) {
          await editMessage(chatId, statusMessageId, t('needPhotoInstruction'), { parse_mode: 'HTML' });
          return;
        }
        logInfo('Image job: edit', { userId, instruction: instruction.slice(0, 80) });
        result = await gemini.editImage(base64, mimeType, instruction);
        params.prompt = instruction;
      } else {
        logInfo('Image job: variation', { userId });
        result = await gemini.variateImage(base64, mimeType);
      }
    }

    if (!result.success || !result.imageData) {
      await editMessage(chatId, statusMessageId, errorMessage(result.error || 'unknown', undefined, lang), {
        parse_mode: 'HTML',
      });
      return;
    }

    await editMessage(chatId, statusMessageId, t('doneSending'));

    const displayPrompt = params.prompt ?? '';
    let caption: string;
    if (type === 'variation') {
      caption = t('variationCaption');
    } else if (type === 'edit') {
      caption = `${t('editedCaption')} <i>${escapeHtml(displayPrompt.slice(0, 200))}</i>`;
    } else {
      caption = `${t('generatedCaption')} <i>${escapeHtml(displayPrompt.slice(0, 200))}</i>`;
    }

    const regenId = displayPrompt ? storePrompt(userId, displayPrompt) : undefined;
    const keyboard = buildResultKeyboard(regenId);

    await sendPhoto(chatId, result.imageData, result.mimeType || 'image/png', caption, keyboard);
    await editMessage(chatId, statusMessageId, t('imageSent'));
  } catch (err) {
    logError('runImageJob failed', err);
    await editMessage(
      chatId,
      statusMessageId,
      errorMessage('unknown', undefined, params.lang),
      { parse_mode: 'HTML' }
    ).catch(() => undefined);
  }
}
