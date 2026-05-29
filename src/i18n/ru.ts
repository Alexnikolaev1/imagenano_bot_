import type { TranslationKey } from './en';

export const ru: Record<TranslationKey, string> = {
  welcome: `👋 <b>Добро пожаловать в Imagnano!</b>

Создаю картинки (Cloudflare Flux), короткие видео и музыку (ModelScope MusicGen).

<b>Быстрый старт:</b>
• Напишите текст — сгенерирую картинку
• <code>/generate закат над Токио, киберпанк</code>
• <code>/video кот идёт по снегу</code> — видео из текста
• <code>/music спокойный lo-fi джаз с пианино</code> — музыка из текста
• Фото + <code>/video плавное приближение камеры</code> — видео из фото
• Фото + подпись — редактирование картинки
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

<b>Видео (~1–5 мин):</b>
/video &lt;описание&gt;
Фото + подпись <code>/video …</code>

<b>Музыка (~5–15 сек, MusicGen):</b>
/music &lt;описание&gt;

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

  videoGenerating: '🎬 Генерирую видео…\n\nОбычно 1–5 минут. Подождите, пожалуйста.',
  videoFromImage: '🎬 Оживляю ваше фото…\n\nОбычно 1–5 минут.',
  videoDoneSending: '✅ Видео готово ({seconds} с). Отправляю…',
  videoSent: '✅ Видео отправлено!',
  videoPreviewSending: '🖼 Кино-кадр готов ({seconds} с). Отправляю…',
  videoPreviewSent: '✅ Кино-кадр отправлен (бесплатный режим Cloudflare).',
  videoGifSending: '🎞 Короткий клип готов ({seconds} с). Отправляю…',
  videoGifSent: '✅ Зацикленный клип отправлен (бесплатный GIF Cloudflare).',
  videoGeneratedCaption: '🎬 <b>Сгенерировано видео:</b>',
  videoGifCaption: '🎞 <b>Короткий клип (бесплатный GIF):</b>',
  videoPreviewCaption: '🖼 <b>Кино-кадр (preview, не mp4):</b>',
  videoFromImageCaption: '🎬 <b>Из вашего фото:</b>',
  videoGifFromImageCaption: '🎞 <b>Клип из фото:</b>',
  videoPreviewFromImageCaption: '🖼 <b>Кино-кадр из фото (preview):</b>',
  videoHowTo: `🎬 <b>Видео из текста</b>

<code>/video описание сцены</code>

Пример:
<code>/video золотистый ретривер бежит по пляжу на закате, кинематографично</code>

<b>Видео из фото:</b> отправьте фото с подписью:
<code>/video медленный зум, листья на ветру</code>

<i>По умолчанию бесплатно:</i> короткий GIF через Cloudflare (~5/день). С <code>MODELSCOPE_API_TOKEN</code> сначала пробует mp4, затем GIF.`,
  videoNotConfigured:
    '🎬 Видео отключено. Для бесплатного GIF достаточно ключей Cloudflare, или включите <code>VIDEO_ENABLED=true</code>.',
  needVideoPrompt:
    '🎬 Укажите описание после <code>/video</code>\n\nПример: <code>/video волны ночью на берегу</code>',

  musicGenerating: '🎵 Генерирую музыку…\n\nОбычно 5–15 секунд. Подождите, пожалуйста.',
  musicDoneSending: '✅ Трек готов ({seconds} с). Отправляю…',
  musicSent: '✅ Музыка отправлена!',
  musicGeneratedCaption: '🎵 <b>Сгенерированная музыка:</b>',
  musicHowTo: `🎵 <b>Музыка из текста</b>

<code>/music описание музыки</code>

Пример:
<code>/music спокойный lo-fi hip-hop с мягким пианино и шумом пластинки</code>

<i>Бесплатно через ModelScope MusicGen-Small</i> (~10 сек, WAV). Нужен <code>MODELSCOPE_API_TOKEN</code>.`,
  musicNotConfigured:
    '🎵 Музыка отключена. Добавьте <code>MODELSCOPE_API_TOKEN</code> (ms-…) на modelscope.cn → Аккаунт → Access tokens.',
};
