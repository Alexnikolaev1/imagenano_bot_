// Encode JPEG/PNG frame buffers into a looping GIF (sharp, no extra deps)

import sharp from 'sharp';

export async function encodeGifFromBase64Frames(
  framesBase64: string[],
  delayMs = 900
): Promise<Buffer> {
  const jpegFrames = await Promise.all(
    framesBase64.map(async (raw) => {
      const trimmed = raw.trim().replace(/^data:[^;]+;base64,/, '');
      const buf = Buffer.from(trimmed, 'base64');
      if (buf.length === 0) throw new Error('Empty frame buffer');
      return sharp(buf).resize(512, 512, { fit: 'cover' }).jpeg({ quality: 85 }).toBuffer();
    })
  );

  // sharp accepts Buffer[] for animated GIF output (types omit this overload)
  return (sharp as (input: Buffer[], options: { animated: boolean }) => sharp.Sharp)(
    jpegFrames,
    { animated: true }
  )
    .gif({ delay: delayMs, loop: 0 })
    .toBuffer();
}
