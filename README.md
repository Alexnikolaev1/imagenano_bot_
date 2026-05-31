# Imagnano — Telegram AI Image Bot

Telegram-бот: **Cloudflare Flux** для картинок, **`/video`** — настоящее MP4 через [fal.ai](https://fal.ai/), **`/videogif`** — бесплатный GIF-клип, **`/music`** — MusicGen через Hugging Face.

## Быстрый старт

```bash
cp .env.example .env
npm install
npm run dev
```

Vercel: переменные из `.env.example` → `npx ts-node scripts/setup-webhook.ts`

## Переменные (минимум)

| Переменная | Описание |
|------------|----------|
| `TELEGRAM_BOT_TOKEN` | @BotFather |
| `CLOUDFLARE_ACCOUNT_ID` | Workers AI |
| `CLOUDFLARE_API_TOKEN` | Workers AI |
| `FAL_KEY` | API-ключ fal.ai для `/video` (MP4) |
| `MAX_REQUESTS_PER_DAY` | Лимит картинок (10) |
| `MAX_FAL_VIDEO_REQUESTS_PER_DAY` | Лимит `/video` MP4 (5) |
| `MAX_VIDEO_GIF_REQUESTS_PER_DAY` | Лимит `/videogif` (10) |
| `HUGGINGFACE_TOKEN` | hf_… token для `/music` (huggingface.co) |
| `MAX_MUSIC_REQUESTS_PER_DAY` | Лимит `/music` (5) |

## `/video` — MP4 через fal.ai

| Параметр | Значение |
|----------|----------|
| Команда | `/video описание` или фото + `/video …` |
| Лимит | **5 MP4 в день** (`MAX_FAL_VIDEO_REQUESTS_PER_DAY`) |
| Модели по умолчанию | Wan 2.2 A14B (T2V + I2V turbo) |
| Оплата | С баланса fal.ai (~$0.05/сек для Wan) |

1. [fal.ai](https://fal.ai) → Dashboard → **API Keys**
2. Vercel:

```env
FAL_KEY=...
MAX_FAL_VIDEO_REQUESTS_PER_DAY=5
# опционально:
# FAL_T2V_MODEL=fal-ai/wan/v2.2-a14b/text-to-video
# FAL_I2V_MODEL=fal-ai/wan/v2.2-a14b/image-to-video/turbo
```

Другие модели (Kling, Veo и т.д.) — укажите ID с [fal.ai/models](https://fal.ai/models).

## `/videogif` — бесплатный GIF (Cloudflare)

| Параметр | Значение |
|----------|----------|
| Команда | `/videogif описание` или фото + `/videogif …` |
| Лимит | **10 GIF в день** |
| Стоимость | Бесплатно (Cloudflare neurons) |
| Результат | 2 кадра Flux → зацикленный GIF с crossfade |

Дополнительных ключей не нужно — достаточно `CLOUDFLARE_*`.

## `/music` — Hugging Face MusicGen

| Параметр | Значение |
|----------|----------|
| Модель | `facebook/musicgen-small` |
| Требования | `HUGGINGFACE_TOKEN` (бесплатно, без карты) |
| Длина | ~10 сек WAV |

```env
HUGGINGFACE_TOKEN=hf_...
MAX_MUSIC_REQUESTS_PER_DAY=5
```

## Команды

| Команда | Описание |
|---------|----------|
| `/generate` | Картинка из текста |
| `/video` | MP4 из текста (fal.ai) |
| `/videogif` | GIF-клип из текста (бесплатно) |
| `/music` | Музыка из текста (~10 сек) |
| Фото + `/video …` | MP4 из фото |
| Фото + `/videogif …` | GIF из фото |
| `/stats` | Лимиты |
