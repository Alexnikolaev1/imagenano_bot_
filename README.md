# Imagnano — Telegram AI Image Bot

Telegram-бот: **Cloudflare Flux** для картинок, **`/video`** — MP4 через ваш **Google Colab + ngrok**, **`/videogif`** — бесплатный GIF, **`/music`** — Hugging Face MusicGen.

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
| `VIDEO_API` | URL Colab/ngrok для `/video` |
| `HUGGINGFACE_TOKEN` | Музыка `/music` |
| `MAX_COLAB_VIDEO_REQUESTS_PER_DAY` | Лимит MP4 (5) |
| `MAX_VIDEO_GIF_REQUESTS_PER_DAY` | Лимит GIF (10) |

## `/video` — Colab на вашем ПК (бесплатно, пока ПК включён)

1. В Google Colab запустите ноутбук с FastAPI endpoint `POST /generate_video/` (поле **`image`** — файл).
2. Пробросьте порт через **ngrok** и скопируйте URL.
3. На **Vercel**:

```env
VIDEO_API=https://6eae-35-187-226-87.ngrok-free.app/generate_video/
VIDEO_API_TIMEOUT_MS=600000
MAX_COLAB_VIDEO_REQUESTS_PER_DAY=5
```

4. **Redeploy** после смены URL ngrok.

| Команда | Поведение |
|---------|-----------|
| `/video описание` | Кадр через Cloudflare → анимация в Colab → MP4 |
| Фото + `/video описание` | Фото сразу в Colab → MP4 |

Пока Colab и ngrok работают — видео бесплатное. Выключили ПК — бот ответит «Colab недоступен».

## `/videogif` — бесплатный GIF (Cloudflare)

10 клипов в день, только ключи Cloudflare. Не требует Colab.

## `/music` — Hugging Face

```env
HUGGINGFACE_TOKEN=hf_...
MAX_MUSIC_REQUESTS_PER_DAY=5
```

## Команды

| Команда | Описание |
|---------|----------|
| `/generate` | Картинка |
| `/video` | MP4 (Colab) |
| `/videogif` | GIF (Cloudflare) |
| `/music` | Музыка |
| `/stats` | Лимиты |
