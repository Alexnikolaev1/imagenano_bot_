import type { TranslationKey } from './en';

export const ru: Record<TranslationKey, string> = {
  welcome: `👋 <b>Добро пожаловать в Imagnano!</b>

Создаю и редактирую изображения с помощью Google Gemini.

<b>Быстрый старт:</b>
• Напишите любой текст — сгенерирую картинку
• <code>/generate закат над Токио, киберпанк</code>
• Фото + подпись — редактирование
• <code>/style</code> — выбор стиля

/help — все команды`,

  help: `🎨 <b>Imagnano — команды</b>

<b>Генерация:</b>
/generate &lt;описание&gt;
Или просто отправьте текст

<b>Редактирование:</b>
Фото + подпись: <code>/edit фиолетовое небо</code>
Или фото + любая инструкция в подписи

<b>Вариация:</b>
Фото + подпись: <code>/variation</code>

<b>Стиль:</b>
/style — пресет (аниме, фото, акварель…)

<b>Прочее:</b>
/stats — лимит на сегодня
/lang — язык (RU / EN)
/help — это сообщение

<b>Inline:</b>
<code>@botname ваш запрос</code> в любом чате

<b>Советы:</b>
Указывайте стиль, освещение, настроение, цвета.`,

  generating: '🎨 Генерирую изображение…',
  editing: '✏️ Редактирую изображение…',
  varying: '🎲 Создаю вариацию…',
  doneSending: '✅ Готово! Отправляю…',
  imageSent: '✅ Изображение отправлено!',
  regenerate: '🔄 Перегенерирую…',
  needPrompt: '❓ Укажите описание.\n\nПример:\n<code>/generate кот-космонавт на Луне</code>',
  needPhotoInstruction: `❓ Что сделать с этим изображением?

• Отправьте снова с инструкцией в подписи
• Или подпись <code>/variation</code> для вариации`,
  notImage: '⚠️ Отправьте файл изображения (JPEG, PNG, WebP).',
  noPhoto: '⚠️ Не удалось найти изображение в сообщении.',
  cancelled: '❌ Отменено.',
  statsTitle: '📊 <b>Ваш лимит на сегодня</b>',
  statsUsed: 'Использовано',
  statsRemaining: 'Осталось',
  statsResetsIn: 'Сброс через',
  statsResetsMidnight: 'Сброс в полночь UTC',
  hours: 'ч',
  generatedCaption: '🎨 <b>Сгенерировано:</b>',
  editedCaption: '✏️ <b>Отредактировано:</b>',
  variationCaption: '🎲 <b>Вариация</b>',
  styleTitle: '🎭 <b>Художественный стиль</b>\n\nСейчас: <b>{style}</b>\n\nВыберите:',
  styleSet: 'Стиль: <b>{style}</b>',
  styleNone: 'По умолчанию (без пресета)',
  langTitle: '🌐 Выберите язык:',
  langSet: 'Язык: <b>{lang}</b>',
  editHowTo: `✏️ <b>Как редактировать</b>

1. Отправьте фото
2. Добавьте инструкцию в подпись

Пример:
<code>сделай небо фиолетовым и добавь звёзды</code>`,
  variationHowTo: `🎲 <b>Вариация</b>

Отправьте фото с подписью <code>/variation</code>`,
  inlineSwitch: 'Введите описание для генерации',
  inlineArticle: '🎨 Сгенерировать: «{prompt}»',
  inlineDesc: 'Открыть бота для генерации в личке',
  regenLimit: '⏰ Дневной лимит исчерпан. Попробуйте завтра.',
  enhanceFailed: '⚠️ Не удалось улучшить запрос, использую оригинал.',
};
