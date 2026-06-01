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

export interface VideoResult {
  success: boolean;
  /** Real MP4 URL from a video API */
  videoUrl?: string;
  /** MP4 bytes as base64 (Colab direct response) */
  videoBase64?: string;
  /** Cloudflare preview mode — cinematic still instead of motion video */
  mode?: 'video' | 'preview' | 'gif';
  imageBase64?: string;
  mimeType?: string;
  error?: string;
}

export interface MusicResult {
  success: boolean;
  audioUrl?: string;
  audioBase64?: string;
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
