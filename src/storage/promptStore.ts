// src/storage/promptStore.ts — short IDs for callback_data (Telegram 64-byte limit)

import crypto from 'crypto';
import fs from 'fs';
import { dataFile } from '../utils/paths';

const PROMPTS_FILE = dataFile('prompt_cache.json');
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CachedPrompt {
  prompt: string;
  userId: number;
  createdAt: number;
}

type PromptStore = Record<string, CachedPrompt>;

function load(): PromptStore {
  try {
    if (fs.existsSync(PROMPTS_FILE)) {
      return JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf-8'));
    }
  } catch {
    // ignore
  }
  return {};
}

function save(store: PromptStore): void {
  const now = Date.now();
  const pruned: PromptStore = {};
  for (const [id, entry] of Object.entries(store)) {
    if (now - entry.createdAt < TTL_MS) {
      pruned[id] = entry;
    }
  }
  try {
    fs.writeFileSync(PROMPTS_FILE, JSON.stringify(pruned));
  } catch {
    // non-critical
  }
}

export function storePrompt(userId: number, prompt: string): string {
  const id = crypto.randomBytes(4).toString('hex');
  const store = load();
  store[id] = { prompt, userId, createdAt: Date.now() };
  save(store);
  return id;
}

export function getPrompt(id: string, userId: number): string | null {
  const entry = load()[id];
  if (!entry || entry.userId !== userId) return null;
  return entry.prompt;
}
