import { STYLE_PRESETS, styleLabel, type Lang } from '../i18n';

export function buildResultKeyboard(regenId?: string) {
  const buttons: Array<Array<{ text: string; callback_data: string }>> = [];

  if (regenId) {
    buttons.push([
      { text: '🔄 Regenerate / Перегенерировать', callback_data: `regen:${regenId}` },
    ]);
  }

  buttons.push([
    { text: '✏️ Edit / Редактировать', callback_data: 'edit_prompt' },
    { text: '🎲 Variation / Вариация', callback_data: 'variation' },
  ]);

  return { inline_keyboard: buttons };
}

export function buildStyleKeyboard(lang: Lang, currentStyle?: string) {
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];
  const keys = Object.keys(STYLE_PRESETS);

  for (let i = 0; i < keys.length; i += 2) {
    const row = keys.slice(i, i + 2).map((key) => ({
      text: `${currentStyle === key ? '✓ ' : ''}${styleLabel(key, lang)}`,
      callback_data: `style:${key}`,
    }));
    rows.push(row);
  }

  return { inline_keyboard: rows };
}

export function buildLangKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🇷🇺 Русский', callback_data: 'lang:ru' },
        { text: '🇬🇧 English', callback_data: 'lang:en' },
      ],
    ],
  };
}

export function buildMainMenuKeyboard(lang: Lang) {
  const isRu = lang === 'ru';
  return {
    keyboard: [
      [
        { text: isRu ? '🎨 Сгенерировать' : '🎨 Generate' },
        { text: isRu ? '🎭 Стиль' : '🎭 Style' },
      ],
      [
        { text: isRu ? '📊 Статистика' : '📊 Stats' },
        { text: isRu ? '❓ Помощь' : '❓ Help' },
      ],
    ],
    resize_keyboard: true,
  };
}

export function buildCancelKeyboard() {
  return {
    inline_keyboard: [[{ text: '❌ Cancel / Отмена', callback_data: 'cancel' }]],
  };
}
