// Resize user photos for Cloudflare FLUX.2 (max 512×512 per input image)

import sharp from 'sharp';

const MAX_EDGE = 512;

export async function resizeForCloudflareInput(imageBase64: string): Promise<Buffer> {
  const input = Buffer.from(normalizeBase64(imageBase64), 'base64');
  if (input.length === 0) {
    throw new Error('Empty image data');
  }

  return sharp(input)
    .rotate()
    .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer();
}

function normalizeBase64(raw: string): string {
  const trimmed = raw.trim();
  const marker = 'base64,';
  const idx = trimmed.indexOf(marker);
  return idx >= 0 ? trimmed.slice(idx + marker.length) : trimmed;
}
