#!/usr/bin/env ts-node
// scripts/setup-webhook.ts
// Run: ts-node scripts/setup-webhook.ts

import https from 'https';
import * as dotenv from 'dotenv';
dotenv.config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const VERCEL_URL = process.env.VERCEL_URL || process.argv[2];

if (!TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not set');
  process.exit(1);
}

if (!VERCEL_URL) {
  console.error('❌ Pass your Vercel URL as argument: ts-node scripts/setup-webhook.ts https://your-app.vercel.app');
  process.exit(1);
}

const webhookUrl = VERCEL_URL.startsWith('http')
  ? `${VERCEL_URL}/api/telegram`
  : `https://${VERCEL_URL}/api/telegram`;

console.log(`Setting webhook to: ${webhookUrl}`);

const body = JSON.stringify({
  url: webhookUrl,
  allowed_updates: ['message', 'callback_query', 'inline_query'],
  drop_pending_updates: true,
});

const options = {
  hostname: 'api.telegram.org',
  path: `/bot${TOKEN}/setWebhook`,
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
    const parsed = JSON.parse(data);
    if (parsed.ok) {
      console.log('✅ Webhook set successfully!');
      console.log('   URL:', webhookUrl);
    } else {
      console.error('❌ Failed to set webhook:', parsed.description);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Request error:', err.message);
});

req.write(body);
req.end();
