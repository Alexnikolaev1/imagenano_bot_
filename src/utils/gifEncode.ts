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

export async function encodeGifFromBase64Frames(
  framesBase64: string[],
  delayMs = 900
): Promise<Buffer> {
  if (framesBase64.length === 0) throw new Error('No frames to encode');

  const frames = await Promise.all(framesBase64.map(decodeFrame));
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
