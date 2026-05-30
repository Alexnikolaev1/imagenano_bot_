# Imagnano — Telegram AI Image Bot

Telegram-бот: **Cloudflare Flux** для картинок, **`/video`** — короткий GIF-клип (2 кадра), **`/music`** — MusicGen через Hugging Face.

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
| `MAX_REQUESTS_PER_DAY` | Лимит картинок (10) |
| `MAX_VIDEO_REQUESTS_PER_DAY` | Лимит `/video` (10) |
| `HUGGINGFACE_TOKEN` | hf_… token для `/music` (huggingface.co) |
| `MAX_MUSIC_REQUESTS_PER_DAY` | Лимит `/music` (5) |

## `/video` — выбранная стратегия (бесплатно каждый день)

После изучения документации:

| Вариант | Бесплатно? | Результат |
|---------|-----------|-----------|
| **Cloudflare GIF** (по умолчанию) | ✅ 10k neurons/день | 2 кадра Flux → зацикленный GIF |
| **ModelScope API** (`ms-` token) | ⚠️ нужна привязка Alibaba Cloud на modelscope.cn | mp4 Wan |
| **DashScope** | ❌ оплата за секунду | Только при `VIDEO_PROVIDER=dashscope` |
| **Civision (браузер)** | Magic Cubes/день | Нет REST API для бота |

### Рекомендуемая конфигурация Vercel

**Только бесплатно (рекомендуется — достаточно ключей Cloudflare):**

```env
VIDEO_PROVIDER=cloudflare_gif
MAX_VIDEO_REQUESTS_PER_DAY=10
```

`MODELSCOPE_API_TOKEN` **не нужен** для GIF-видео. Если token добавлен, видео всё равно идёт через Cloudflare, пока не указан `VIDEO_PROVIDER=modelscope`.

**mp4 через ModelScope** (нужна привязка Alibaba Cloud на modelscope.cn — это не DashScope и не оплата):

```env
VIDEO_PROVIDER=modelscope
MODELSCOPE_API_TOKEN=ms-...
MAX_VIDEO_REQUESTS_PER_DAY=10
```

При ошибке ModelScope бот автоматически отправит GIF (fallback по умолчанию).

## `/music` — Hugging Face MusicGen (рекомендуется)

| Параметр | Значение |
|----------|----------|
| Модель | `facebook/musicgen-small` |
| Требования | `HUGGINGFACE_TOKEN` (бесплатно, без карты и Alibaba) |
| Длина | ~10 сек WAV |

1. [huggingface.co](https://huggingface.co) → Settings → **Access Tokens** → New (Read)
2. Vercel:

```env
HUGGINGFACE_TOKEN=hf_...
MAX_MUSIC_REQUESTS_PER_DAY=5
```

Первый запрос может занять 1–2 мин (холодный старт модели).

ModelScope (`MODELSCOPE_API_TOKEN`) — опционально, но нужен **китайский** Aliyun, International не подходит.

## Команды

| Команда | Описание |
|---------|----------|
| `/generate` | Картинка из текста |
| `/video` | Клип из текста |
| `/music` | Музыка из текста (~10 сек) |
| Фото + `/video …` | Клип из фото |
| `/stats` | Лимиты |
