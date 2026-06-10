// api/video-poll.ts — chained HF Space polls (each invocation stays under Vercel maxDuration)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { waitUntil } from '@vercel/functions';
import {
  isValidPollSecret,
  processHfVideoPollJob,
  type HfVideoPollJob,
} from '../src/services/hfVideoPollJob';
import { logError, logInfo, logWarn } from '../src/utils/logger';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!isValidPollSecret(req.headers['x-video-poll-secret'])) {
    logWarn('video-poll: unauthorized');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const job = req.body as HfVideoPollJob;
  if (!job?.eventId || !job?.spaceRaw || !job?.chatId) {
    res.status(400).json({ error: 'Invalid job payload' });
    return;
  }

  logInfo('video-poll: accepted', { eventId: job.eventId, attempt: job.attempts });

  res.status(200).json({ ok: true });

  waitUntil(
    processHfVideoPollJob(job).catch((err) => logError('video-poll: job failed', err))
  );
}
