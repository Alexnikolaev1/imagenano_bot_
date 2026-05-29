// src/config.ts — single source of truth for environment configuration

export interface AppConfig {
  telegramToken: string;
  /** Cloudflare Workers AI credentials (image generation) */
  cloudflareAccountId: string;
  cloudflareApiToken: string;
  /** Cloudflare image model (default: Flux Schnell, free tier) */
  cloudflareImageModel: string;
  /** Optional Google AI Studio key — only used for prompt enhancement (text) */
  googleApiKey?: string;
  /** Gemini text model used for prompt enhancement */
  geminiTextModel: string;
  adminChatId?: string;
  maxRequestsPerDay: number;
  enhancePrompts: boolean;
  botUsername?: string;
  defaultLang: 'ru' | 'en';
}

export function loadConfig(): AppConfig {
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!telegramToken) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');
  }
  if (!cloudflareAccountId) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID environment variable is not set');
  }
  if (!cloudflareApiToken) {
    throw new Error('CLOUDFLARE_API_TOKEN environment variable is not set');
  }

  const defaultLang = process.env.DEFAULT_LANG === 'en' ? 'en' : 'ru';
  const googleApiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;

  return {
    telegramToken,
    cloudflareAccountId,
    cloudflareApiToken,
    cloudflareImageModel:
      process.env.CLOUDFLARE_IMAGE_MODEL || '@cf/black-forest-labs/flux-1-schnell',
    googleApiKey,
    geminiTextModel: process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash',
    adminChatId: process.env.ADMIN_CHAT_ID,
    maxRequestsPerDay: parseInt(process.env.MAX_REQUESTS_PER_DAY || '10', 10),
    // Prompt enhancement requires a Google key; disabled automatically without one
    enhancePrompts: process.env.ENHANCE_PROMPTS !== 'false' && Boolean(googleApiKey),
    botUsername: process.env.BOT_USERNAME,
    defaultLang,
  };
}
