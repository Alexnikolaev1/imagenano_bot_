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

    default:
      return isRu
        ? `❌ <b>Ошибка.</b>\n\n<code>${escapeHtml(errorCode.slice(0, 200))}</code>\n\nПопробуйте позже.`
        : `❌ <b>Something went wrong.</b>\n\n<code>${escapeHtml(errorCode.slice(0, 200))}</code>\n\nTry again later.`;
  }
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
