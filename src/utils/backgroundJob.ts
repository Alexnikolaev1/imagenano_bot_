// Run work after the Telegram webhook responds (Vercel waitUntil)

import { logError } from './logger';

export function runInBackground(task: () => Promise<void>): void {
  const promise = task().catch((err) => logError('Background job failed', err));

  try {
    // Dynamic import keeps local `ts-node` working without Vercel runtime
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { waitUntil } = require('@vercel/functions') as {
      waitUntil: (p: Promise<unknown>) => void;
    };
    waitUntil(promise);
  } catch {
    void promise;
  }
}
