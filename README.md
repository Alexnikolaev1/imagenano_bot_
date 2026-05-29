# Imagnano — Telegram AI Image Bot

Telegram-бот: **Cloudflare Flux** для картинок, **`/video`** — короткие клипы, **`/music`** — MusicGen через ModelScope.

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
| `MAX_VIDEO_REQUESTS_PER_DAY` | Лимит `/video` (5) |
| `MODELSCOPE_API_TOKEN` | ms-… token для `/music` и опционально mp4 `/video` |
| `MAX_MUSIC_REQUESTS_PER_DAY` | Лимит `/music` (5) |

## `/video` — выбранная стратегия (бесплатно каждый день)

После изучения документации:

| Вариант | Бесплатно? | Результат |
|---------|-----------|-----------|
| **Cloudflare GIF** (по умолчанию) | ✅ 10k neurons/день | 2 кадра Flux → зацикленный GIF |
| **ModelScope API** (`ms-` token) | ✅ ~2000 вызовов/день | mp4, если модель на API-Inference |
| **DashScope** | ❌ оплата за секунду | Не используется по умолчанию |
| **Civision (браузер)** | Magic Cubes/день | Нет REST API для бота |

### Рекомендуемая конфигурация Vercel

**Только бесплатно, без сюрпризов:**

```env
VIDEO_PROVIDER=cloudflare_gif
MAX_VIDEO_REQUESTS_PER_DAY=5
```

**С вашим `ms-` token (сначала mp4, при ошибке — GIF):**

```env
MODELSCOPE_API_TOKEN=ms-...
MAX_VIDEO_REQUESTS_PER_DAY=5
# VIDEO_PROVIDER=modelscope  # опционально, так и так по умолчанию при наличии token
```

ModelScope video endpoint подтверждён: `POST https://api-inference.modelscope.cn/v1/videos/generations`.  
Модели Wan на страницах modelscope — не все доступны через API; в коде перебор fallback ID (Wan 2.2 → 2.1).

## `/music` — MusicGen-Small (бесплатно с ms-token)

| Параметр | Значение |
|----------|----------|
| Модель | `AI-ModelScope/musicgen-small` |
| Endpoint | `POST /v1/images/generations` (async) |
| Длина | ~10 сек WAV |
| Скорость | ~5–15 сек |
| Квота ModelScope | ~20–2000 вызовов/день (общий пул API-Inference) |

```env
MODELSCOPE_API_TOKEN=ms-...
MAX_MUSIC_REQUESTS_PER_DAY=5
```

## Команды

| Команда | Описание |
|---------|----------|
| `/generate` | Картинка из текста |
| `/video` | Клип из текста |
| `/music` | Музыка из текста (~10 сек) |
| Фото + `/video …` | Клип из фото |
| `/stats` | Лимиты |
