import type { Lang } from '../i18n';

export function errorMessage(errorCode: string, resetIn?: number, lang: Lang = 'ru'): string {
  const isRu = lang === 'ru';

  switch (errorCode) {
    case 'rate_limit':
      return isRu
        ? '⏳ <b>Достигнут лимит запросов.</b>\n\nПодождите немного и попробуйте снова.'
        : '⏳ <b>Rate limit reached.</b>\n\nWait a moment and try again.';

    case 'need_instruction':
      return isRu
        ? '✏️ <b>Нужна подпись к фото.</b>\n\nНапример: <code>дорисуй кошку</code> или <code>/edit фиолетовое небо</code>'
        : '✏️ <b>Caption required.</b>\n\nExample: <code>add a cat</code> or <code>/edit purple sky</code>';

    case 'auth_error':
      return isRu
        ? '🔑 <b>Ошибка API-ключа.</b>\n\nСвяжитесь с администратором бота.'
        : '🔑 <b>API authentication error.</b>\n\nContact the bot administrator.';

    case 'safety_block':
      return isRu
        ? '🚫 <b>Запрос заблокирован фильтрами безопасности.</b>\n\nПопробуйте другой запрос или изображение.'
        : '🚫 <b>Request blocked by safety filters.</b>\n\nTry a different prompt or image.';

    case 'user_rate_limit': {
      const hours = resetIn ? Math.ceil(resetIn / 3600) : 24;
      return isRu
        ? `⏰ <b>Дневной лимит исчерпан.</b>\n\nСброс через ~${hours} ч.`
        : `⏰ <b>Daily limit reached.</b>\n\nResets in ~${hours} hour${hours !== 1 ? 's' : ''}.`;
    }

    case 'video_rate_limit': {
      const hours = resetIn ? Math.ceil(resetIn / 3600) : 24;
      return isRu
        ? `⏰ <b>Дневной лимит видео исчерпан.</b>\n\nСброс через ~${hours} ч.`
        : `⏰ <b>Daily video limit reached.</b>\n\nResets in ~${hours} hour${hours !== 1 ? 's' : ''}.`;
    }

    case 'video_not_configured':
      return isRu
        ? '🎬 <b>Видео не настроено.</b>\n\nДобавьте <code>MODELSCOPE_API_TOKEN</code> (бесплатная квота) или включите <code>VIDEO_PROVIDER=cloudflare_preview</code>.'
        : '🎬 <b>Video is not configured.</b>\n\nAdd <code>MODELSCOPE_API_TOKEN</code> (free tier) or set <code>VIDEO_PROVIDER=cloudflare_preview</code>.';

    case 'modelscope_daily_limit':
      return isRu
        ? '⏰ <b>Исчерпана дневная квота ModelScope API</b> (~2000 вызовов/сутки, сброс в 00:00 UTC+8).\n\nПопробуйте завтра. Для видео бот отправит GIF через Cloudflare (если включён fallback).'
        : '⏰ <b>ModelScope daily API quota reached</b> (~2000 calls/day, resets 00:00 UTC+8).\n\nTry tomorrow. For video, the bot falls back to a Cloudflare GIF when enabled.';

    case 'modelscope_alibaba_bind_required':
      return isRu
        ? '☁️ <b>ModelScope требует привязку Alibaba Cloud.</b>\n\nЭто не DashScope и не оплата — просто верификация аккаунта на modelscope.cn:\n1. Войдите на <b>modelscope.cn</b>\n2. Профиль → привязать <b>Alibaba Cloud</b>\n3. Повторите запрос\n\n<b>Видео без этого:</b> в Vercel поставьте <code>VIDEO_PROVIDER=cloudflare_gif</code> (бесплатный GIF, только ключи Cloudflare).'
        : '☁️ <b>ModelScope requires an Alibaba Cloud account link.</b>\n\nThis is not DashScope billing — just account verification on modelscope.cn:\n1. Log in at <b>modelscope.cn</b>\n2. Profile → bind <b>Alibaba Cloud</b>\n3. Try again\n\n<b>Video without that:</b> set <code>VIDEO_PROVIDER=cloudflare_gif</code> on Vercel (free GIF, Cloudflare keys only).';

    case 'modelscope_auth_error':
      return isRu
        ? '🔑 <b>Неверный ModelScope token.</b>\n\nПроверьте <code>MODELSCOPE_API_TOKEN</code> (ms-…) на modelscope.cn → Access tokens.'
        : '🔑 <b>Invalid ModelScope token.</b>\n\nCheck <code>MODELSCOPE_API_TOKEN</code> (ms-…) at modelscope.cn → Access tokens.';

    case 'modelscope_no_video_model':
      return isRu
        ? '🎬 <b>Модель Wan не доступна через бесплатный API Inference.</b>\n\nНа modelscope.cn выберите модель с бейджем <b>API-Inference</b> и укажите её ID в <code>MODELSCOPE_T2V_MODEL</code> / <code>MODELSCOPE_I2V_MODEL</code>.\n\nИли поставьте <code>VIDEO_PROVIDER=cloudflare_preview</code> — бесплатный кино-кадр (не mp4).'
        : '🎬 <b>Wan model is not on the free API-Inference tier.</b>\n\nPick a model with the <b>API-Inference</b> badge on modelscope.cn and set <code>MODELSCOPE_T2V_MODEL</code> / <code>MODELSCOPE_I2V_MODEL</code>.\n\nOr set <code>VIDEO_PROVIDER=cloudflare_preview</code> for a free cinematic still (not mp4).';

    case 'video_timeout':
      return isRu
        ? '⏳ <b>Видео не успело сгенерироваться за отведённое время.</b>\n\nПопробуйте короче промпт или позже.'
        : '⏳ <b>Video generation timed out.</b>\n\nTry a shorter prompt or try again later.';

    case 'need_video_prompt':
      return isRu
        ? '🎬 <b>Нужно описание для видео.</b>\n\nПример:\n<code>/video кот идёт по снегу, кинематографично</code>'
        : '🎬 <b>Video prompt required.</b>\n\nExample:\n<code>/video a cat walking in snow, cinematic</code>';

    case 'music_rate_limit': {
      const hours = resetIn ? Math.ceil(resetIn / 3600) : 24;
      return isRu
        ? `⏰ <b>Дневной лимит музыки исчерпан.</b>\n\nСброс через ~${hours} ч.`
        : `⏰ <b>Daily music limit reached.</b>\n\nResets in ~${hours} hour${hours !== 1 ? 's' : ''}.`;
    }

    case 'modelscope_no_music_model':
      return isRu
        ? '🎵 <b>MusicGen недоступен через API Inference.</b>\n\nПроверьте <code>MODELSCOPE_MUSIC_MODEL=AI-ModelScope/musicgen-small</code> на modelscope.cn (бейдж API-Inference).'
        : '🎵 <b>MusicGen is not available on API Inference.</b>\n\nCheck <code>MODELSCOPE_MUSIC_MODEL=AI-ModelScope/musicgen-small</code> on modelscope.cn (API-Inference badge).';

    case 'music_timeout':
      return isRu
        ? '⏳ <b>Музыка не успела сгенерироваться за отведённое время.</b>\n\nПопробуйте короче промпт или позже.'
        : '⏳ <b>Music generation timed out.</b>\n\nTry a shorter prompt or try again later.';

    default: {
      if (/bind.*alibaba|alibaba cloud account/i.test(errorCode)) {
        return errorMessage('modelscope_alibaba_bind_required', resetIn, lang);
      }
      return isRu
        ? `❌ <b>Ошибка.</b>\n\n<code>${escapeHtml(errorCode.slice(0, 200))}</code>\n\nПопробуйте позже.`
        : `❌ <b>Something went wrong.</b>\n\n<code>${escapeHtml(errorCode.slice(0, 200))}</code>\n\nTry again later.`;
    }
  }
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
