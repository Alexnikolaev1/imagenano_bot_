import type { TranslationKey } from './en';

export const ru: Record<TranslationKey, string> = {
  welcome: `👋 <b>Добро пожаловать в Imagnano!</b>

Создаю картинки (Cloudflare Flux), MP4-видео через Hugging Face Space (LTX-Video), бесплатные GIF и музыку.

<b>Быстрый старт:</b>
• Напишите текст — сгенерирую картинку
• <code>/generate закат над Токио, киберпанк</code>
• <code>/video кот идёт по снегу</code> — MP4 через HF Space (5/день)
• <code>/videogif волны на пляже</code> — бесплатный GIF (10/день)
• Фото + <code>/video плавный зум</code> — оживить фото (LTX)
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

<b>Видео MP4 (Hugging Face Space, LTX-Video):</b>
/video &lt;описание&gt;
Фото + подпись <code>/video …</code>
Нужны <code>HF_VIDEO_SPACE</code> + <code>HUGGINGFACE_TOKEN</code>. Лимит: 5/день

<b>Видео GIF (бесплатно, Cloudflare):</b>
/videogif &lt;описание&gt;
Лимит: 10/день

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
  videoHowTo: `🎬 <b>MP4-видео (Hugging Face Space, LTX-Video)</b>

<code>/video описание сцены</code>

Пример:
<code>/video золотистый ретривер бежит по пляжу на закате</code>

<b>Из фото:</b> отправьте фото с подписью:
<code>/video медленный зум, листья на ветру</code>

Space должен быть <b>Running</b> на Hugging Face. На сервере:
<code>HF_VIDEO_SPACE=alex555196/videobot</code>
<code>HUGGINGFACE_TOKEN=hf_…</code>

Обычно 1–5 минут (ZeroGPU). Лимит: 5 MP4 в день. Бесплатный GIF: <code>/videogif</code>.`,
  videoMp4NotConfigured:
    '🎬 <b>MP4-видео не настроено.</b>\n\nДобавьте <code>HF_VIDEO_SPACE=alex555196/videobot</code> и <code>HUGGINGFACE_TOKEN</code> на сервер.\n\nИли Colab: <code>VIDEO_API=…</code>\n\nБесплатно: <code>/videogif</code>',
  colabNotConfigured:
    '🎬 <b>Colab-видео не настроено.</b>\n\nДобавьте на сервер <code>VIDEO_API=https://….ngrok-free.app/generate_video/</code> (из запущенного ноутбука Colab).\n\nБесплатно: <code>/videogif</code>',
  videoGifHowTo: `🎞 <b>Бесплатный GIF (Cloudflare)</b>

<code>/videogif описание сцены</code>
(то же, что <code>/video</code>)

Пример:
<code>/videogif кот на подоконнике, за окном дождь, уютно</code>

<b>Из фото:</b> отправьте фото с подписью:
<code>/videogif лёгкий ветер, волосы слегка двигаются</code>

<i>Лимит:</i> 10 GIF в день. Дополнительных ключей кроме Cloudflare не нужно.`,
  videoGifGenerating: '🎞 Генерирую видео-клип…\n\nОбычно 30–90 секунд.',
  videoGifFromImage: '🎞 Оживляю фото…\n\nОбычно 30–90 секунд.',
  needVideoGifPrompt:
    '🎞 Укажите описание после команды\n\nПример: <code>/video волны ночью на берегу</code>',
  videoNotConfigured:
    '🎞 <b>Видео отключено.</b>\n\nУкажите <code>HF_VIDEO_SPACE</code> для MP4 или проверьте ключи Cloudflare для <code>/videogif</code>.',
  needVideoPrompt:
    '🎞 Укажите описание после <code>/video</code>\n\nПример: <code>/video волны ночью на берегу</code>',

  musicGenerating: '🎵 Генерирую музыку…\n\nОбычно 15–60 секунд (первый раз до 2 мин). Подождите, пожалуйста.',
  musicDoneSending: '✅ Трек готов ({seconds} с). Отправляю…',
  musicSent: '✅ Музыка отправлена!',
  musicGeneratedCaption: '🎵 <b>Сгенерированная музыка:</b>',
  musicHowTo: `🎵 <b>Музыка из текста</b>

<code>/music описание музыки</code>

Пример:
<code>/music спокойный lo-fi hip-hop с мягким пианино</code>

<i>Бесплатно через Hugging Face MusicGen</i> (~10 сек, WAV). Нужен <code>HUGGINGFACE_TOKEN</code> на Vercel.`,
  musicNotConfigured:
    '🎵 Музыка отключена. Добавьте <code>HUGGINGFACE_TOKEN</code> на huggingface.co → Settings → Access Tokens (Read).',
};
