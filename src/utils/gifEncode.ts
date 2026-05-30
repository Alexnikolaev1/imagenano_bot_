// Encode JPEG/PNG frame buffers into a looping GIF (gifenc + sharp)

import sharp from 'sharp';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

interface RgbaFrame {
  data: Uint8Array;
  width: number;
  height: number;
}

const GIF_SIZE = 512;

async function decodeFrame(raw: string): Promise<RgbaFrame> {
  const trimmed = raw.trim().replace(/^data:[^;]+;base64,/, '');
  const buf = Buffer.from(trimmed, 'base64');
  if (buf.length === 0) throw new Error('Empty frame buffer');

  const { data, info } = await sharp(buf)
    .resize(GIF_SIZE, GIF_SIZE, { fit: 'cover' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data: new Uint8Array(data),
    width: info.width,
    height: info.height,
  };
}

function blendRgba(a: Uint8Array, b: Uint8Array, t: number): Uint8Array {
  const out = new Uint8Array(a.length);
  const mix = Math.min(1, Math.max(0, t));
  const inv = 1 - mix;
  for (let i = 0; i < a.length; i += 4) {
    out[i] = Math.round(a[i] * inv + b[i] * mix);
    out[i + 1] = Math.round(a[i + 1] * inv + b[i + 1] * mix);
    out[i + 2] = Math.round(a[i + 2] * inv + b[i + 2] * mix);
    out[i + 3] = Math.round(a[i + 3] * inv + b[i + 3] * mix);
  }
  return out;
}

async function rgbaToJpegBase64(data: Uint8Array, width: number, height: number): Promise<string> {
  const jpeg = await sharp(Buffer.from(data), {
    raw: { width, height, channels: 4 },
  })
    .jpeg({ quality: 88 })
    .toBuffer();
  return jpeg.toString('base64');
}

/** Insert blended frames between keyframes for a smooth loop (A → B → A). */
export async function expandKeyframesWithCrossfade(
  keyframesBase64: string[],
  stepsBetween: number
): Promise<string[]> {
  if (keyframesBase64.length < 2 || stepsBetween < 2) return keyframesBase64;

  const decoded = await Promise.all(keyframesBase64.map(decodeFrame));
  const a = decoded[0];
  const b = decoded.length === 1 ? decoded[0] : decoded[1];

  if (buffersEqual(a.data, b.data)) return keyframesBase64;

  const out: string[] = [];

  // A → B
  out.push(keyframesBase64[0]);
  for (let s = 1; s < stepsBetween; s++) {
    const t = s / stepsBetween;
    const blended = blendRgba(a.data, b.data, t);
    out.push(await rgbaToJpegBase64(blended, a.width, a.height));
  }
  out.push(keyframesBase64[1] ?? keyframesBase64[0]);

  // B → A (smooth loop back)
  for (let s = 1; s < stepsBetween; s++) {
    const t = s / stepsBetween;
    const blended = blendRgba(b.data, a.data, t);
    out.push(await rgbaToJpegBase64(blended, a.width, a.height));
  }

  return out;
}

function buffersEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export interface GifEncodeOptions {
  /** Blended frames between keyframes (0 = off). Default applied in caller. */
  crossfadeSteps?: number;
}

export async function encodeGifFromBase64Frames(
  framesBase64: string[],
  delayMs = 130,
  options: GifEncodeOptions = {}
): Promise<Buffer> {
  if (framesBase64.length === 0) throw new Error('No frames to encode');

  const crossfadeSteps = options.crossfadeSteps ?? 0;
  const expanded =
    crossfadeSteps >= 2 && framesBase64.length >= 2
      ? await expandKeyframesWithCrossfade(framesBase64, crossfadeSteps)
      : framesBase64;

  const frames = await Promise.all(expanded.map(decodeFrame));
  const gif = GIFEncoder();

  for (const frame of frames) {
    const palette = quantize(frame.data, 256);
    const index = applyPalette(frame.data, palette);
    gif.writeFrame(index, frame.width, frame.height, { palette, delay: delayMs });
  }

  gif.finish();
  return Buffer.from(gif.bytes());
}

/** Last-resort: static GIF from one frame (sharp single-frame path). */
export async function encodeStaticGifFromBase64(frameBase64: string): Promise<Buffer> {
  const trimmed = frameBase64.trim().replace(/^data:[^;]+;base64,/, '');
  const buf = Buffer.from(trimmed, 'base64');
  return sharp(buf).resize(GIF_SIZE, GIF_SIZE, { fit: 'cover' }).gif({ loop: 0 }).toBuffer();
}
