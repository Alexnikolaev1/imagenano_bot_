import { Bot } from 'grammy';
import type { AppContext } from '../context';
import { assertMusicRateLimit } from '../services/rateLimitGuard';
import { runMusicJob } from '../services/musicPipeline';
import { getUserLang } from '../storage/userPrefs';
import { logError, logInfo } from '../utils/logger';

export function registerMusicHandlers(bot: Bot<AppContext>): void {
  bot.command('music', async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    if (!userId || !chatId) return;

    const lang = getUserLang(userId, ctx.from?.language_code);

    if (!ctx.musicService) {
      await ctx.reply(ctx.t('musicNotConfigured'), { parse_mode: 'HTML' });
      return;
    }

    const rawPrompt = ctx.match?.trim();
    if (!rawPrompt) {
      await ctx.reply(ctx.t('musicHowTo'), { parse_mode: 'HTML' });
      return;
    }

    const guard = assertMusicRateLimit(userId, ctx.config.maxMusicRequestsPerDay, lang);
    if (!guard.ok) {
      await ctx.reply(guard.message, { parse_mode: 'HTML' });
      return;
    }

    const statusMsg = await ctx.reply(ctx.t('musicGenerating'), { parse_mode: 'HTML' });
    logInfo('Music command', { userId, prompt: rawPrompt.slice(0, 80) });

    try {
      await runMusicJob({
        chatId,
        statusMessageId: statusMsg.message_id,
        userId,
        prompt: rawPrompt,
        lang,
        maxMusicRequestsPerDay: ctx.config.maxMusicRequestsPerDay,
        musicService: ctx.musicService,
        t: ctx.t,
      });
    } catch (err) {
      logError('Music command job failed', err);
    }
  });
}
