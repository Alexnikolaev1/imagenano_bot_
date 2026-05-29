import { Bot } from 'grammy';
import type { AppContext } from '../context';
import { buildMainMenuKeyboard } from '../utils/keyboards';
import { assertRateLimit } from '../services/rateLimitGuard';
import { runImageJob } from '../services/imagePipeline';
import { getUserLang, getUserStyle } from '../storage/userPrefs';
import { escapeHtml } from '../utils/messages';
import { logError, logInfo } from '../utils/logger';

export function registerStartHandlers(bot: Bot<AppContext>): void {
  bot.command('start', async (ctx) => {
    const param = ctx.match?.trim();
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    const lang = userId ? getUserLang(userId, ctx.from?.language_code) : ctx.config.defaultLang;

    // Deep link from inline: /start gen_<encoded prompt>
    if (param?.startsWith('gen_') && userId && chatId) {
      const prompt = decodeURIComponent(param.slice(4));
      if (!prompt) {
        await sendWelcome(ctx, lang);
        return;
      }

      const guard = assertRateLimit(userId, ctx.config.maxRequestsPerDay, lang);
      if (!guard.ok) {
        await ctx.reply(guard.message, { parse_mode: 'HTML' });
        return;
      }

      const statusMsg = await ctx.reply(
        `${ctx.t('generating')}\n<i>${escapeHtml(prompt.slice(0, 60))}</i>`,
        { parse_mode: 'HTML' }
      );

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
      }).catch((err) => logError('Deep-link generate failed', err));

      return;
    }

    await sendWelcome(ctx, lang);

    // Register bot commands menu (best-effort)
    try {
      const isRu = lang === 'ru';
      await ctx.api.setMyCommands([
        { command: 'generate', description: isRu ? 'Сгенерировать изображение' : 'Generate an image' },
        { command: 'style', description: isRu ? 'Художественный стиль' : 'Art style preset' },
        { command: 'stats', description: isRu ? 'Лимит на сегодня' : 'Usage stats' },
        { command: 'lang', description: isRu ? 'Язык интерфейса' : 'Interface language' },
        { command: 'help', description: isRu ? 'Справка' : 'Help' },
      ]);
    } catch {
      // non-critical
    }

    logInfo('User started bot', { userId });
  });
}

async function sendWelcome(ctx: AppContext, lang: 'ru' | 'en'): Promise<void> {
  await ctx.reply(ctx.t('welcome'), {
    parse_mode: 'HTML',
    reply_markup: buildMainMenuKeyboard(lang),
  });
}
