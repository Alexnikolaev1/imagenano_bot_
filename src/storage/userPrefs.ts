// src/storage/userPrefs.ts — per-user language and style preferences

import fs from 'fs';
import { dataFile } from '../utils/paths';
import type { Lang } from '../i18n';

const PREFS_FILE = dataFile('user_prefs.json');

export interface UserPrefs {
  lang?: Lang;
  style?: string;
}

type PrefsStore = Record<string, UserPrefs>;

function load(): PrefsStore {
  try {
    if (fs.existsSync(PREFS_FILE)) {
      return JSON.parse(fs.readFileSync(PREFS_FILE, 'utf-8'));
    }
  } catch {
    // ignore
  }
  return {};
}

function save(store: PrefsStore): void {
  try {
    fs.writeFileSync(PREFS_FILE, JSON.stringify(store));
  } catch {
    // non-critical
  }
}

export function getUserPrefs(userId: number): UserPrefs {
  return load()[String(userId)] ?? {};
}

export function setUserLang(userId: number, lang: Lang): void {
  const store = load();
  const key = String(userId);
  store[key] = { ...store[key], lang };
  save(store);
}

export function setUserStyle(userId: number, style: string): void {
  const store = load();
  const key = String(userId);
  store[key] = { ...store[key], style };
  save(store);
}

export function getUserLang(userId: number, telegramLangCode?: string): Lang {
  const prefs = getUserPrefs(userId);
  if (prefs.lang) return prefs.lang;
  if (telegramLangCode?.startsWith('ru')) return 'ru';
  return process.env.DEFAULT_LANG === 'en' ? 'en' : 'ru';
}

export function getUserStyle(userId: number): string | undefined {
  const style = getUserPrefs(userId).style;
  return style && style !== 'none' ? style : undefined;
}
