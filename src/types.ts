// src/types.ts

export interface UserRateLimit {
  count: number;
  resetAt: number; // Unix timestamp in ms
}

export interface GenerationResult {
  success: boolean;
  imageData?: string;   // base64
  mimeType?: string;
  error?: string;
}

export interface BotConfig {
  telegramToken: string;
  googleApiKey: string;
  adminChatId?: string;
  maxRequestsPerDay: number;
}

export interface TelegramFileInfo {
  file_id: string;
  file_path: string;
  file_size?: number;
}
