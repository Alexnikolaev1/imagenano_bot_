import { Context } from 'grammy';
import { en, TranslationKey } from './en';
import { ru } from './ru';
import { getUserLang } from '../storage/userPrefs';

export type Lang = 'ru' | 'en';

const catalogs: Record<Lang, Record<TranslationKey, string>> = { en, ru };

export function createTranslator(lang: Lang): (key: TranslationKey, vars?: Record<string, string | number>) => string {
  const catalog = catalogs[lang] ?? catalogs.en;
  return (key, vars) => {
    let text = catalog[key] ?? catalogs.en[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return text;
  };
}

export function tForContext(ctx: Context): (key: TranslationKey, vars?: Record<string, string | number>) => string {
  const userId = ctx.from?.id;
  const lang = userId ? getUserLang(userId, ctx.from?.language_code) : 'ru';
  return createTranslator(lang);
}

export const STYLE_PRESETS: Record<string, { label: { ru: string; en: string }; suffix: string }> = {
  none: {
    label: { ru: '⬜ Без стиля', en: '⬜ Default' },
    suffix: '',
  },
  photo: {
    label: { ru: '📷 Фотореализм', en: '📷 Photorealistic' },
    suffix: ', photorealistic, highly detailed, 8K, professional photography',
  },
  anime: {
    label: { ru: '🎌 Аниме', en: '🎌 Anime' },
    suffix: ', anime style, vibrant colors, detailed linework',
  },
  watercolor: {
    label: { ru: '🖌 Акварель', en: '🖌 Watercolor' },
    suffix: ', watercolor painting, soft edges, artistic brush strokes',
  },
  oil: {
    label: { ru: '🎨 Масло', en: '🎨 Oil painting' },
    suffix: ', oil painting on canvas, rich textures, classical art',
  },
  cyberpunk: {
    label: { ru: '🌃 Киберпанк', en: '🌃 Cyberpunk' },
    suffix: ', cyberpunk style, neon lights, futuristic city, cinematic',
  },
  pixel: {
    label: { ru: '👾 Пиксель-арт', en: '👾 Pixel art' },
    suffix: ', pixel art style, retro 16-bit game aesthetic',
  },
  '3d': {
    label: { ru: '🧊 3D рендер', en: '🧊 3D render' },
    suffix: ', 3D render, octane render, studio lighting, CGI',
  },
};

export function styleLabel(key: string, lang: Lang): string {
  const preset = STYLE_PRESETS[key];
  if (!preset) return key;
  return preset.label[lang];
}

export function applyStyleToPrompt(prompt: string, styleKey: string | undefined): string {
  if (!styleKey || styleKey === 'none') return prompt;
  const preset = STYLE_PRESETS[styleKey];
  if (!preset?.suffix) return prompt;
  return `${prompt}${preset.suffix}`;
}
