import { Bot } from 'grammy';
import type { AppContext } from '../context';
import { getRateLimitInfo } from '../utils/rateLimit';
import { buildStyleKeyboard, buildLangKeyboard } from '../utils/keyboards';
import { getUserLang, getUserStyle } from '../storage/userPrefs';
import { styleLabel } from '../i18n';

export function registerCommandHandlers(bot: Bot<AppContext>): void {
  bot.command('help', async (ctx) => {
    await ctx.reply(ctx.t('help'), { parse_mode: 'HTML' });
  });

  bot.command('stats', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const lang = getUserLang(userId, ctx.from?.language_code);
    const max = ctx.config.maxRequestsPerDay;
    const info = getRateLimitInfo(userId, max);

    await ctx.reply(
      `${ctx.t('statsTitle')}\n\n` +
        `${ctx.t('statsUsed')}: <b>${info.used}</b> / ${max}\n` +
        `${ctx.t('statsRemaining')}: <b>${info.remaining}</b>\n` +
        (info.resetIn > 0
          ? `${ctx.t('statsResetsIn')}: <b>${Math.ceil(info.resetIn / 3600)}${ctx.t('hours')}</b>`
          : ctx.t('statsResetsMidnight')),
      { parse_mode: 'HTML' }
    );
  });

  bot.command('style', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    const lang = getUserLang(userId, ctx.from?.language_code);
    const current = getUserStyle(userId) ?? 'none';

    await ctx.reply(ctx.t('styleTitle', { style: styleLabel(current, lang) }), {
      parse_mode: 'HTML',
      reply_markup: buildStyleKeyboard(lang, current),
    });
  });

  bot.command('lang', async (ctx) => {
    await ctx.reply(ctx.t('langTitle'), {
      parse_mode: 'HTML',
      reply_markup: buildLangKeyboard(),
    });
  });

  bot.command('edit', async (ctx) => {
    await ctx.reply(ctx.t('editHowTo'), { parse_mode: 'HTML' });
  });

  bot.command('variation', async (ctx) => {
    await ctx.reply(ctx.t('variationHowTo'), { parse_mode: 'HTML' });
  });

  // Menu button aliases (reply keyboard)
  bot.hears(['🎨 Сгенерировать', '🎨 Generate'], async (ctx) => {
    const lang = ctx.from?.id
      ? getUserLang(ctx.from.id, ctx.from.language_code)
      : 'ru';
    const hint =
      lang === 'ru'
        ? '✍️ Напишите описание изображения или используйте:\n<code>/generate ваш запрос</code>'
        : '✍️ Send a description or use:\n<code>/generate your prompt</code>';
    await ctx.reply(hint, { parse_mode: 'HTML' });
  });

  bot.hears(['🎭 Стиль', '🎭 Style'], async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    const lang = getUserLang(userId, ctx.from?.language_code);
    const current = getUserStyle(userId) ?? 'none';
    await ctx.reply(ctx.t('styleTitle', { style: styleLabel(current, lang) }), {
      parse_mode: 'HTML',
      reply_markup: buildStyleKeyboard(lang, current),
    });
  });

  bot.hears(['📊 Статистика', '📊 Stats'], async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    const max = ctx.config.maxRequestsPerDay;
    const info = getRateLimitInfo(userId, max);
    await ctx.reply(
      `${ctx.t('statsTitle')}\n\n` +
        `${ctx.t('statsUsed')}: <b>${info.used}</b> / ${max}\n` +
        `${ctx.t('statsRemaining')}: <b>${info.remaining}</b>`,
      { parse_mode: 'HTML' }
    );
  });

  bot.hears(['❓ Помощь', '❓ Help'], async (ctx) => {
    await ctx.reply(ctx.t('help'), { parse_mode: 'HTML' });
  });
}
