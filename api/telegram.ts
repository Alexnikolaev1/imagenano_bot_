// api/telegram.ts — Vercel Serverless Function (webhook handler)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { webhookCallback } from 'grammy';
import { createBot } from '../src/bot';
import { logInfo, logError } from '../src/utils/logger';

type WebhookHandler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

// Singleton bot instance (reused across warm invocations)
let handlerCache: WebhookHandler | null = null;

function getHandler(): WebhookHandler {
  if (!handlerCache) {
    logInfo('Initializing bot instance');
    const { bot } = createBot();
    // Wait for handlers (including image generation + sendPhoto) before responding.
    // Must exceed typical Cloudflare + Telegram round-trip; matches maxDuration in vercel.json.
    handlerCache = webhookCallback(bot, 'http', {
      timeoutMilliseconds: 55_000,
    }) as unknown as WebhookHandler;
  }
  return handlerCache;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Health check
  if (req.method === 'GET') {
    res.status(200).json({ status: 'ok', ts: new Date().toISOString() });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    logInfo('Incoming webhook update');
    const webhookHandler = getHandler();
    await webhookHandler(req, res);
  } catch (err) {
    logError('Webhook handler error', err);
    // Always respond 200 so Telegram doesn't retry
    if (!res.headersSent) {
      res.status(200).json({ ok: true });
    }
  }
}
