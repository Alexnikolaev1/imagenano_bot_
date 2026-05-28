<<<<<<< HEAD
# imagenano_bot
Создание изображений вТГ
=======
# Imagnano — Telegram AI Image Bot

Telegram-бот для генерации и редактирования изображений через **Google Gemini**, с деплоем на **Vercel** (webhook) или локально (long polling).

## Возможности

- **Генерация** — `/generate …` или просто текст в чат
- **Редактирование** — фото + подпись с инструкцией
- **Вариации** — фото + `/variation`
- **Стили** — `/style` (фото, аниме, акварель, киберпанк, 3D…)
- **RU / EN** — `/lang`, автоопределение по языку Telegram
- **Улучшение промптов** — короткие запросы расширяются через Gemini Flash
- **Inline mode** — `@botname описание` в любом чате
- **Лимиты** — N запросов в сутки на пользователя

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
│   │   ├── geminiService.ts
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
# Заполните TELEGRAM_BOT_TOKEN и GOOGLE_AI_STUDIO_API_KEY

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
| `GOOGLE_AI_STUDIO_API_KEY` | да | Ключ Google AI Studio |
| `ADMIN_CHAT_ID` | нет | Уведомления об ошибках |
| `MAX_REQUESTS_PER_DAY` | нет | Лимит (по умолчанию 10) |
| `DEFAULT_LANG` | нет | `ru` или `en` |
| `GEMINI_IMAGE_MODEL` | нет | По умолчанию `gemini-2.5-flash-image` |
| `ENHANCE_PROMPTS` | нет | `false` чтобы отключить улучшение промптов |

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
