// src/utils/paths.ts — cross-platform temp paths (Windows + Vercel /tmp)

import fs from 'fs';
import os from 'os';
import path from 'path';

const DATA_DIR = path.join(os.tmpdir(), 'imagnano_bot');

export function getDataDir(): string {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  return DATA_DIR;
}

export function dataFile(name: string): string {
  return path.join(getDataDir(), name);
}
