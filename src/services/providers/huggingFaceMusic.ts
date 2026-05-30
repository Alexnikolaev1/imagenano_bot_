// Hugging Face Inference API — facebook/musicgen-small (free tier, no Alibaba)

import { logInfo, logWarn } from '../../utils/logger';
import type { MusicResult } from '../../types';

export interface HuggingFaceMusicConfig {
  apiToken: string;
  model: string;
  maxRetries: number;
  retryDelayMs: number;
  requestTimeoutMs: number;
}

export class HuggingFaceMusicService {
  constructor(private config: HuggingFaceMusicConfig) {}

  async textToMusic(prompt: string): Promise<MusicResult> {
    const url = `https://api-inference.huggingface.co/models/${this.config.model}`;
    const inputs = prompt.trim().slice(0, 1024);
    if (!inputs) return { success: false, error: 'need_music_prompt' };

    logInfo('HF music submit', { model: this.config.model, prompt: inputs.slice(0, 80) });

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs }),
          signal: AbortSignal.timeout(this.config.requestTimeoutMs),
        });

        if (res.status === 503 || res.status === 429) {
          const waitSec = await parseEstimatedWait(res);
          logWarn('HF music warming up or rate limited', {
            status: res.status,
            waitSec,
            attempt,
          });
          if (attempt < this.config.maxRetries) {
            await sleep(Math.min(waitSec * 1000, 60_000) || this.config.retryDelayMs);
            continue;
          }
          return {
            success: false,
            error: res.status === 429 ? 'rate_limit' : 'hf_model_loading',
          };
        }

        const contentType = res.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          const body = (await res.json()) as Record<string, unknown>;
          const err = String(body.error || body.message || `HuggingFace HTTP ${res.status}`);
          logWarn('HF music JSON error', { status: res.status, body });
          if (/loading|warming|starting/i.test(err) && attempt < this.config.maxRetries) {
            await sleep(this.config.retryDelayMs);
            continue;
          }
          return { success: false, error: normalizeHfError(err) };
        }

        if (!res.ok) {
          const text = await res.text();
          logWarn('HF music HTTP error', { status: res.status, body: text.slice(0, 200) });
          return { success: false, error: normalizeHfError(text) || `HuggingFace HTTP ${res.status}` };
        }

        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length === 0) return { success: false, error: 'hf_empty_audio' };

        const mimeType = contentType.includes('audio/')
          ? contentType.split(';')[0].trim()
          : 'audio/wav';

        logInfo('HF music succeeded', { bytes: buffer.length, mimeType });
        return { success: true, audioBase64: buffer.toString('base64'), mimeType };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (attempt < this.config.maxRetries && /timeout|abort/i.test(message)) {
          logWarn('HF music timeout, retrying', { attempt, message });
          await sleep(this.config.retryDelayMs);
          continue;
        }
        logWarn('HF music request failed', { message });
        return { success: false, error: message };
      }
    }

    return { success: false, error: 'hf_timeout' };
  }
}

async function parseEstimatedWait(res: Response): Promise<number> {
  try {
    const body = (await res.clone().json()) as { estimated_time?: number };
    if (typeof body.estimated_time === 'number' && body.estimated_time > 0) {
      return body.estimated_time;
    }
  } catch {
    // ignore
  }
  return 20;
}

function normalizeHfError(raw: string): string {
  const lower = raw.toLowerCase();
  if (/loading|warming|starting/i.test(lower)) return 'hf_model_loading';
  if (/rate limit|too many/i.test(lower)) return 'rate_limit';
  if (/authorization|unauthorized|invalid token|auth/i.test(lower)) return 'hf_auth_error';
  return raw.slice(0, 200);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
