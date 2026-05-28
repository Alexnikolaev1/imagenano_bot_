// src/utils/fileUtils.ts
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { dataFile } from './paths';

export async function downloadTelegramFile(
  botToken: string,
  fileId: string
): Promise<{ data: Buffer; mimeType: string; filePath: string }> {
  // Step 1: Get file path from Telegram
  const infoUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`;
  const fileInfo = await fetchJson<{
    ok: boolean;
    result: { file_path: string; file_size?: number };
  }>(infoUrl);

  if (!fileInfo.ok) {
    throw new Error('Failed to get file info from Telegram');
  }

  const filePath = fileInfo.result.file_path;
  const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

  // Step 2: Download actual file
  const data = await downloadBuffer(downloadUrl);

  // Guess mime type from extension
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
  };
  const mimeType = mimeMap[ext] || 'image/jpeg';

  return { data, mimeType, filePath };
}

export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

export function saveTempFile(data: Buffer, filename: string): string {
  const tmpPath = dataFile(filename);
  fs.writeFileSync(tmpPath, data);
  return tmpPath;
}

export function deleteTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // non-critical
  }
}

function fetchJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Failed to parse JSON response'));
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function downloadBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}
