// src/utils/logger.ts
import https from 'https';

const adminChatId = process.env.ADMIN_CHAT_ID;
const botToken = process.env.TELEGRAM_BOT_TOKEN;

export function logInfo(message: string, data?: unknown): void {
  console.log(`[INFO] ${new Date().toISOString()} ${message}`, data || '');
}

export function logError(message: string, error?: unknown): void {
  console.error(`[ERROR] ${new Date().toISOString()} ${message}`, error || '');
}

export function logWarn(message: string, data?: unknown): void {
  console.warn(`[WARN] ${new Date().toISOString()} ${message}`, data || '');
}

export async function notifyAdmin(message: string): Promise<void> {
  if (!adminChatId || !botToken) return;

  try {
    const text = `🚨 *Bot Error*\n\`\`\`\n${message}\n\`\`\``;
    await sendTelegramMessage(adminChatId, text);
  } catch {
    // Don't throw from admin notifier
  }
}

function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${botToken}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', resolve);
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
