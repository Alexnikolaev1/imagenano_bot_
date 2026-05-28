// src/config.ts — single source of truth for environment configuration

export interface AppConfig {
  telegramToken: string;
  googleApiKey: string;
  adminChatId?: string;
  maxRequestsPerDay: number;
  enhancePrompts: boolean;
  botUsername?: string;
  defaultLang: 'ru' | 'en';
  /** Image generation model (default: free-tier Nano Banana on AI Studio) */
  geminiImageModel: string;
}

export function loadConfig(): AppConfig {
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const googleApiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;

  if (!telegramToken) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');
  }
  if (!googleApiKey) {
    throw new Error('GOOGLE_AI_STUDIO_API_KEY environment variable is not set');
  }

  const defaultLang = process.env.DEFAULT_LANG === 'en' ? 'en' : 'ru';

  return {
    telegramToken,
    googleApiKey,
    adminChatId: process.env.ADMIN_CHAT_ID,
    maxRequestsPerDay: parseInt(process.env.MAX_REQUESTS_PER_DAY || '10', 10),
    enhancePrompts: process.env.ENHANCE_PROMPTS !== 'false',
    botUsername: process.env.BOT_USERNAME,
    defaultLang,
    geminiImageModel: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
  };
}
