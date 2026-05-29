// src/services/telegramSender.ts
// Low-level Telegram API sender for use in async contexts (after webhook has responded)
import https from 'https';
import fs from 'fs';
import path from 'path';
import { dataFile } from '../utils/paths';
import { logError } from '../utils/logger';

const BASE_URL = 'https://api.telegram.org';

function getToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not set');
  return token;
}

export async function sendMessage(
  chatId: number | string,
  text: string,
  options: {
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    reply_markup?: object;
    message_thread_id?: number;
  } = {}
): Promise<{ message_id: number }> {
  const body = JSON.stringify({
    chat_id: chatId,
    text,
    ...options,
  });

  return apiRequest('/sendMessage', body);
}

export async function editMessage(
  chatId: number | string,
  messageId: number,
  text: string,
  options: { parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2' } = {}
): Promise<void> {
  const body = JSON.stringify({
    chat_id: chatId,
    message_id: messageId,
    text,
    ...options,
  });

  await apiRequest('/editMessageText', body);
}

export async function sendPhoto(
  chatId: number | string,
  imageBase64: string,
  mimeType: string,
  caption?: string,
  replyMarkup?: object
): Promise<{ message_id: number }> {
  // Save to temp file, send as multipart
  const ext = mimeType.split('/')[1] || 'jpg';
  const filename = `output_${Date.now()}.${ext}`;
  const tmpPath = dataFile(filename);

  try {
    const normalized = normalizeBase64(imageBase64);
    const buffer = Buffer.from(normalized, 'base64');
    if (buffer.length === 0) {
      throw new Error('Decoded image buffer is empty');
    }
    fs.writeFileSync(tmpPath, buffer);

    const result = await sendPhotoFile(chatId, tmpPath, filename, mimeType, caption, replyMarkup);
    return result;
  } finally {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {
      // non-critical cleanup
    }
  }
}

function sendPhotoFile(
  chatId: number | string,
  filePath: string,
  filename: string,
  mimeType: string,
  caption?: string,
  replyMarkup?: object
): Promise<{ message_id: number }> {
  return new Promise((resolve, reject) => {
    const boundary = `----FormBoundary${Date.now()}`;
    const fileData = fs.readFileSync(filePath);

    const parts: Buffer[] = [];

    // chat_id field
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`
    ));

    // photo file
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    ));
    parts.push(fileData);
    parts.push(Buffer.from('\r\n'));

    // caption
    if (caption) {
      parts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`
      ));
      parts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="parse_mode"\r\n\r\nHTML\r\n`
      ));
    }

    // reply_markup
    if (replyMarkup) {
      parts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="reply_markup"\r\n\r\n${JSON.stringify(replyMarkup)}\r\n`
      ));
    }

    parts.push(Buffer.from(`--${boundary}--\r\n`));

    const body = Buffer.concat(parts);

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${getToken()}/sendPhoto`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.ok) {
            resolve(parsed.result);
          } else {
            const err = new Error(`Telegram sendPhoto error: ${parsed.description}`);
            logError('sendPhoto rejected by Telegram', {
              description: parsed.description,
              errorCode: parsed.error_code,
            });
            reject(err);
          }
        } catch {
          reject(new Error('Failed to parse sendPhoto response'));
        }
      });
    });

    req.on('error', (err) => {
      logError('sendPhoto network error', err);
      reject(err);
    });
    req.write(body);
    req.end();
  });
}

function normalizeBase64(raw: string): string {
  const trimmed = raw.trim();
  const marker = 'base64,';
  const idx = trimmed.indexOf(marker);
  return idx >= 0 ? trimmed.slice(idx + marker.length) : trimmed;
}

function apiRequest<T = { message_id: number }>(endpoint: string, body: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${getToken()}${endpoint}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.ok) {
            resolve(parsed.result as T);
          } else {
            reject(new Error(`Telegram API error: ${parsed.description}`));
          }
        } catch {
          reject(new Error('Failed to parse Telegram API response'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
