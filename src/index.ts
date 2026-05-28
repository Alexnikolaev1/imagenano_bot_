// src/index.ts — local development with long polling
import * as dotenv from 'dotenv';
dotenv.config();

import { createBot } from './bot';
import { logInfo } from './utils/logger';

async function main(): Promise<void> {
  logInfo('Starting bot in long polling mode (local dev)…');

  const { bot } = createBot();

  // Graceful shutdown
  process.once('SIGINT', () => bot.stop());
  process.once('SIGTERM', () => bot.stop());

  await bot.start({
    onStart: (botInfo) => {
      logInfo(`Bot @${botInfo.username} is running`);
    },
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
