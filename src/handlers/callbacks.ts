import { Bot } from 'grammy';
import type { AppContext } from '../context';
import { assertRateLimit } from '../services/rateLimitGuard';
import { runImageJob } from '../services/imagePipeline';
import { getPrompt } from '../storage/promptStore';
import { getUserLang, getUserStyle, setUserLang, setUserStyle } from '../storage/userPrefs';
import { styleLabel } from '../i18n';
import { logError } from '../utils/logger';

export function registerCallbackHandlers(bot: Bot<AppContext>): void {
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from?.id;
    const chatId = ctx.callbackQuery.message?.chat.id;
    const messageId = ctx.callbackQuery.message?.message_id;

    if (!userId || !chatId) {
      await ctx.answerCallbackQuery();
      return;
    }

    const lang = getUserLang(userId, ctx.from?.language_code);

    if (data === 'cancel') {
      await ctx.answerCallbackQuery();
      if (messageId) {
        await ctx.api.editMessageText(chatId, messageId, ctx.t('cancelled'));
      }
      return;
    }

    if (data === 'edit_prompt') {
      await ctx.answerCallbackQuery();
      await ctx.reply(ctx.t('editHowTo'), { parse_mode: 'HTML' });
      return;
    }

    if (data === 'variation') {
      await ctx.answerCallbackQuery();
      await ctx.reply(ctx.t('variationHowTo'), { parse_mode: 'HTML' });
      return;
    }

    if (data.startsWith('style:')) {
      const styleKey = data.slice(6);
      setUserStyle(userId, styleKey);
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(
        ctx.t('styleSet', { style: styleLabel(styleKey, lang) }),
        { parse_mode: 'HTML' }
      );
      return;
    }

    if (data.startsWith('lang:')) {
      const newLang = data.slice(5) as 'ru' | 'en';
      if (newLang === 'ru' || newLang === 'en') {
        setUserLang(userId, newLang);
        const label = newLang === 'ru' ? 'Русский' : 'English';
        await ctx.answerCallbackQuery();
        await ctx.editMessageText(ctx.t('langSet', { lang: label }), { parse_mode: 'HTML' });
      }
      return;
    }

    if (data.startsWith('regen:')) {
      const promptId = data.slice(6);
      const prompt = getPrompt(promptId, userId);
      if (!prompt) {
        await ctx.answerCallbackQuery({ text: '⚠️ Prompt expired. Generate again.', show_alert: true });
        return;
      }

      const guard = assertRateLimit(userId, ctx.config.maxRequestsPerDay, lang);
      if (!guard.ok) {
        await ctx.answerCallbackQuery({ text: ctx.t('regenLimit'), show_alert: true });
        return;
      }

      await ctx.answerCallbackQuery({ text: '🔄' });
      const statusMsg = await ctx.reply(ctx.t('regenerate'));

      runImageJob({
        chatId,
        statusMessageId: statusMsg.message_id,
        userId,
        type: 'generate',
        prompt,
        styleKey: getUserStyle(userId),
        lang,
        enhance: ctx.config.enhancePrompts,
        imageService: ctx.imageService,
        enhancer: ctx.imageService.getEnhancer(),
        t: ctx.t,
      }).catch((err) => logError('Regen job failed', err));
      return;
    }

    await ctx.answerCallbackQuery();
  });
}
