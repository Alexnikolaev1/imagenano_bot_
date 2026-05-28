import { Bot, InlineQueryResultBuilder } from 'grammy';
import type { AppContext } from '../context';
import { escapeHtml } from '../utils/messages';

export function registerInlineHandlers(bot: Bot<AppContext>): void {
  bot.on('inline_query', async (ctx) => {
    const prompt = ctx.inlineQuery.query.trim();
    const t = ctx.t;

    if (!prompt || prompt.length < 3) {
      await ctx.answerInlineQuery([], {
        cache_time: 0,
        switch_pm_text: t('inlineSwitch'),
        switch_pm_parameter: 'inline_help',
      } as Parameters<typeof ctx.answerInlineQuery>[1]);
      return;
    }

    const username = ctx.me.username;
    const shortPrompt = prompt.slice(0, 40) + (prompt.length > 40 ? '…' : '');

    const result = InlineQueryResultBuilder.article(
      `gen_${Date.now()}`,
      t('inlineArticle', { prompt: shortPrompt }),
      {
        description: t('inlineDesc'),
        reply_markup: {
          inline_keyboard: [[
            {
              text: '🎨 Open bot / Открыть бота',
              url: `https://t.me/${username}?start=gen_${encodeURIComponent(prompt.slice(0, 200))}`,
            },
          ]],
        },
      }
    ).text(
      `🎨 <b>${escapeHtml(prompt.slice(0, 100))}</b>`,
      { parse_mode: 'HTML' }
    );

    await ctx.answerInlineQuery([result], { cache_time: 0 });
  });
}
