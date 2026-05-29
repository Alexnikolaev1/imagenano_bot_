<<<<<<< HEAD
# imagenano_bot
Создание изображений вТГ
=======
# Imagnano — Telegram AI Image Bot

Telegram-бот для генерации изображений через **Cloudflare Workers AI (Flux Schnell)**, с деплоем на **Vercel** (webhook) или локально (long polling).

## Возможности

- **Генерация** — `/generate …` или просто текст в чат
- **Стили** — `/style` (фото, аниме, акварель, киберпанк, 3D…)
- **RU / EN** — `/lang`, автоопределение по языку Telegram
- **Улучшение промптов** — короткие запросы расширяются через Gemini Flash (опционально, нужен Google-ключ)
- **Inline mode** — `@botname описание` в любом чате
- **Лимиты** — N запросов в сутки на пользователя

> Flux Schnell генерирует изображения по тексту. Редактирование фото и вариации (image-to-image) этой моделью не поддерживаются.

## Архитектура

```
imagnano_bot/
├── api/telegram.ts              # Vercel webhook
├── src/
│   ├── bot.ts                   # Фабрика бота + middleware
│   ├── config.ts                # Переменные окружения
│   ├── context.ts               # Типизированный AppContext
│   ├── handlers/                # Модули по типу событий
│   │   ├── start.ts
│   │   ├── commands.ts
│   │   ├── generate.ts
│   │   ├── photo.ts
│   │   ├── callbacks.ts
│   │   ├── inline.ts
│   │   └── text.ts
│   ├── services/
│   │   ├── imageService.ts      # Cloudflare Workers AI (Flux Schnell)
│   │   ├── promptEnhancer.ts
│   │   ├── imagePipeline.ts     # Единый async-пайплайн
│   │   ├── rateLimitGuard.ts
│   │   └── telegramSender.ts
│   ├── storage/
│   │   ├── userPrefs.ts         # Язык и стиль
│   │   └── promptStore.ts       # ID для кнопки «Перегенерировать»
│   ├── i18n/                    # ru + en
│   └── utils/
└── scripts/setup-webhook.ts
```

### Ключевые решения

**Webhook + фоновая обработка:** grammY отвечает Telegram сразу (`webhookCallback` с `return`), генерация идёт асинхронно; результат отправляется через `sendPhoto`.

**Кроссплатформенное хранилище:** данные в `os.tmpdir()/imagnano_bot/` (Windows, Vercel `/tmp`).

**Callback_data ≤ 64 байт:** полный промпт хранится в `promptStore`, в кнопке только короткий `regen:<id>`.

## Быстрый старт

```bash
cp .env.example .env
# Заполните TELEGRAM_BOT_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN

npm install
npm run dev          # long polling локально
```

### Vercel

1. Импортируйте репозиторий в Vercel
2. Добавьте переменные из `.env.example`
3. `npx ts-node scripts/setup-webhook.ts`

## Переменные окружения

| Переменная | Обязательно | Описание |
|------------|-------------|----------|
| `TELEGRAM_BOT_TOKEN` | да | Токен от @BotFather |
| `CLOUDFLARE_ACCOUNT_ID` | да | Account ID из дашборда Cloudflare |
| `CLOUDFLARE_API_TOKEN` | да | API-токен с доступом к Workers AI |
| `CLOUDFLARE_IMAGE_MODEL` | нет | По умолчанию `@cf/black-forest-labs/flux-1-schnell` |
| `GOOGLE_AI_STUDIO_API_KEY` | нет | Только для улучшения промптов (текст); без него улучшение отключается |
| `GEMINI_TEXT_MODEL` | нет | По умолчанию `gemini-2.5-flash` |
| `ENHANCE_PROMPTS` | нет | `false` чтобы отключить улучшение промптов |
| `ADMIN_CHAT_ID` | нет | Уведомления об ошибках |
| `MAX_REQUESTS_PER_DAY` | нет | Лимит (по умолчанию 10) |
| `DEFAULT_LANG` | нет | `ru` или `en` |

## Команды бота

| Команда | Описание |
|---------|----------|
| `/start` | Приветствие и меню |
| `/generate` | Генерация по описанию |
| `/style` | Пресет художественного стиля |
| `/stats` | Использование лимита |
| `/lang` | Язык интерфейса |
| `/help` | Справка |
>>>>>>> b9d4ceb (first take)
