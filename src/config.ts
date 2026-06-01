// src/config.ts — single source of truth for environment configuration

import { normalizeEditModel, normalizeGenerateModel } from './utils/cloudflareModel';

export interface AppConfig {
  telegramToken: string;
  /** Cloudflare Workers AI credentials (image generation) */
  cloudflareAccountId: string;
  cloudflareApiToken: string;
  /** Text-to-image model (default: Flux Schnell) */
  cloudflareImageModel: string;
  /** Photo edit / variation model (default: Flux Klein 4B, multipart) */
  cloudflareEditImageModel: string;
  /** Optional Google AI Studio key — only used for prompt enhancement (text) */
  googleApiKey?: string;
  /** Gemini text model used for prompt enhancement */
  geminiTextModel: string;
  adminChatId?: string;
  maxRequestsPerDay: number;
  enhancePrompts: boolean;
  botUsername?: string;
  defaultLang: 'ru' | 'en';
  /** Legacy alias — same as maxVideoGifRequestsPerDay */
  maxVideoRequestsPerDay: number;
  /** Free Cloudflare GIF clips (/videogif) */
  maxVideoGifRequestsPerDay: number;
  videoGifEnabled: boolean;
  /** Colab/ngrok MP4 (/video) */
  videoApiUrl?: string;
  maxColabVideoRequestsPerDay: number;
  colabVideoEnabled: boolean;
  /** MusicGen via ModelScope — separate daily limit */
  maxMusicRequestsPerDay: number;
  musicEnabled: boolean;
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
    cloudflareImageModel: normalizeGenerateModel(process.env.CLOUDFLARE_IMAGE_MODEL),
    cloudflareEditImageModel: normalizeEditModel(process.env.CLOUDFLARE_EDIT_IMAGE_MODEL),
    googleApiKey,
    geminiTextModel: process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash',
    adminChatId: process.env.ADMIN_CHAT_ID,
    maxRequestsPerDay: parseInt(process.env.MAX_REQUESTS_PER_DAY || '10', 10),
    // Prompt enhancement requires a Google key; disabled automatically without one
    enhancePrompts: process.env.ENHANCE_PROMPTS !== 'false' && Boolean(googleApiKey),
    botUsername: process.env.BOT_USERNAME,
    defaultLang,
    maxVideoGifRequestsPerDay: parseInt(
      process.env.MAX_VIDEO_GIF_REQUESTS_PER_DAY ||
        process.env.MAX_VIDEO_REQUESTS_PER_DAY ||
        '10',
      10
    ),
    maxVideoRequestsPerDay: parseInt(
      process.env.MAX_VIDEO_GIF_REQUESTS_PER_DAY ||
        process.env.MAX_VIDEO_REQUESTS_PER_DAY ||
        '10',
      10
    ),
    videoGifEnabled: process.env.VIDEO_GIF_ENABLED !== 'false',
    videoApiUrl: process.env.VIDEO_API?.trim() || undefined,
    maxColabVideoRequestsPerDay: parseInt(
      process.env.MAX_COLAB_VIDEO_REQUESTS_PER_DAY ||
        process.env.MAX_VIDEO_REQUESTS_PER_DAY ||
        '5',
      10
    ),
    colabVideoEnabled: process.env.COLAB_VIDEO_ENABLED !== 'false',
    maxMusicRequestsPerDay: parseInt(process.env.MAX_MUSIC_REQUESTS_PER_DAY || '5', 10),
    musicEnabled: process.env.MUSIC_ENABLED !== 'false',
  };
}
