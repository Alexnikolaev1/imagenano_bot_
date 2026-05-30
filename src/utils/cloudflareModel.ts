/** Cloudflare Workers AI model id helpers */

const DEFAULT_GENERATE = '@cf/black-forest-labs/flux-1-schnell';
const DEFAULT_EDIT = '@cf/black-forest-labs/flux-2-klein-4b';

export function normalizeCloudflareModelId(raw: string | undefined, fallback: string): string {
  const value = raw?.trim();
  if (!value) return fallback;
  if (value.startsWith('@cf/')) return value;
  if (value.includes('/')) return `@cf/${value.replace(/^@cf\//, '')}`;
  return fallback;
}

export function normalizeGenerateModel(raw: string | undefined): string {
  return normalizeCloudflareModelId(raw, DEFAULT_GENERATE);
}

export function normalizeEditModel(raw: string | undefined): string {
  return normalizeCloudflareModelId(raw, DEFAULT_EDIT);
}

/** FLUX.2 klein/dev models require multipart form data (even prompt-only). */
export function requiresMultipart(model: string): boolean {
  const id = model.toLowerCase();
  return id.includes('klein') || id.includes('flux-2') || id.includes('flux-2-dev');
}

export function parseCloudflareError(status: number, body: string): string {
  try {
    const data = JSON.parse(body) as {
      errors?: Array<{ message?: string; code?: number }>;
    };
    const message = data.errors?.map((e) => e.message).join('; ') || '';
    const lower = message.toLowerCase();

    if (/nsfw|3030/i.test(message) || lower.includes('nsfw')) {
      return 'safety_block';
    }
    if (status === 404 || lower.includes('not found') || lower.includes('does not exist')) {
      return 'cloudflare_model_not_found';
    }
    if (lower.includes('unsupported input') || lower.includes('unsupported')) {
      return 'cloudflare_unsupported_input';
    }
    if (status === 429) return 'rate_limit';
    if (status === 401 || status === 403) return 'auth_error';
    if (message) return message.slice(0, 300);
  } catch {
    // ignore JSON parse errors
  }

  if (status === 404) return 'cloudflare_model_not_found';
  if (status === 429) return 'rate_limit';
  if (status === 401 || status === 403) return 'auth_error';
  return `Cloudflare AI error ${status}`;
}
