export const en = {
  welcome: `👋 <b>Welcome to Imagnano!</b>

I create images (Cloudflare Flux), short video clips, and music (ModelScope MusicGen).

<b>Quick start:</b>
• Send any text — I'll generate an image
• <code>/generate sunset over Tokyo, cyberpunk</code>
• <code>/video a cat walking in snow</code> — text to video
• <code>/music calm lo-fi jazz with piano</code> — text to music
• Photo + <code>/video gentle camera zoom</code> — image to video
• Send a photo with a caption to edit it
• <code>/style</code> — pick an art style

/help — all commands`,

  help: `🎨 <b>Imagnano — Commands</b>

<b>Generate:</b>
/generate &lt;prompt&gt;
Or just send a text message

<b>Edit:</b>
Photo + caption: <code>/edit purple sky</code>
Or photo + any instruction as caption

<b>Variation:</b>
Photo + caption: <code>/variation</code>

<b>Style:</b>
/style — choose preset (anime, photo, watercolor…)

<b>Video (~1–5 min):</b>
/video &lt;prompt&gt;
Photo + caption <code>/video …</code>

<b>Music (~5–15 sec, MusicGen):</b>
/music &lt;prompt&gt;

<b>Other:</b>
/stats — usage today
/lang — language (RU / EN)
/help — this message

<b>Inline:</b>
<code>@botname your prompt</code> in any chat

<b>Tips:</b>
Be specific: style, lighting, mood, colors.`,

  generating: '🎨 Generating image…',
  editing: '✏️ Editing image…',
  varying: '🎲 Creating variation…',
  doneSending: '✅ Done! Sending image…',
  imageSent: '✅ Image sent!',
  regenerate: '🔄 Regenerating image…',
  needPrompt: '❓ Please provide a prompt.\n\nExample:\n<code>/generate cat astronaut on the moon</code>',
  needPhotoInstruction: `❓ What should I do with this image?

• Send again with edit instruction as caption
• Or caption <code>/variation</code> for a variation`,
  notImage: '⚠️ Please send an image file (JPEG, PNG, WebP).',
  noPhoto: '⚠️ Could not find image in message.',
  cancelled: '❌ Cancelled.',
  statsTitle: '📊 <b>Your usage today</b>',
  statsUsed: 'Used',
  statsRemaining: 'Remaining',
  statsResetsIn: 'Resets in',
  statsResetsMidnight: 'Resets at midnight UTC',
  hours: 'h',
  generatedCaption: '🎨 <b>Generated:</b>',
  editedCaption: '✏️ <b>Edited:</b>',
  variationCaption: '🎲 <b>Variation</b>',
  styleTitle: '🎭 <b>Art style</b>\n\nCurrent: <b>{style}</b>\n\nTap to select:',
  styleSet: 'Style set: <b>{style}</b>',
  styleNone: 'Default (no preset)',
  langTitle: '🌐 Choose language:',
  langSet: 'Language: <b>{lang}</b>',
  editHowTo: `✏️ <b>How to edit</b>

1. Send a photo
2. Add instruction as caption

Example caption:
<code>make the sky purple and add stars</code>`,
  variationHowTo: `🎲 <b>Variation</b>

Send a photo with caption <code>/variation</code>`,
  inlineSwitch: 'Type a prompt to generate an image',
  inlineArticle: '🎨 Generate: "{prompt}"',
  inlineDesc: 'Open bot to generate in private chat',
  regenLimit: '⏰ Daily limit reached. Try again tomorrow.',
  enhanceFailed: '⚠️ Could not enhance prompt, using original.',

  videoGenerating: '🎬 Generating video…\n\nThis usually takes 1–5 minutes. Please wait.',
  videoFromImage: '🎬 Animating your photo…\n\nUsually 1–5 minutes.',
  videoDoneSending: '✅ Video ready ({seconds}s). Sending…',
  videoSent: '✅ Video sent!',
  videoPreviewSending: '🖼 Cinematic still ready ({seconds}s). Sending…',
  videoPreviewSent: '✅ Cinematic still sent (free Cloudflare mode).',
  videoGifSending: '🎞 Short clip ready ({seconds}s). Sending…',
  videoGifSent: '✅ Looping clip sent (free Cloudflare GIF).',
  videoGeneratedCaption: '🎬 <b>Generated video:</b>',
  videoGifCaption: '🎞 <b>Looping clip (free GIF):</b>',
  videoPreviewCaption: '🖼 <b>Cinematic still (preview, not mp4):</b>',
  videoFromImageCaption: '🎬 <b>From your photo:</b>',
  videoGifFromImageCaption: '🎞 <b>Looping clip from photo:</b>',
  videoPreviewFromImageCaption: '🖼 <b>Cinematic still from photo (preview):</b>',
  videoHowTo: `🎬 <b>Text-to-video</b>

<code>/video your scene description</code>

Example:
<code>/video a golden retriever running on a beach at sunset, cinematic</code>

<b>Image-to-video:</b> send a photo with caption:
<code>/video slow zoom in, leaves moving in the wind</code>

<i>Free by default:</i> short looping GIF via Cloudflare (Cloudflare keys only). mp4 via ModelScope requires <code>VIDEO_PROVIDER=modelscope</code> and Alibaba Cloud linked on modelscope.cn.`,
  videoNotConfigured:
    '🎬 Video is disabled. Cloudflare keys are enough for free GIF mode, or set <code>VIDEO_ENABLED=true</code>.',
  needVideoPrompt:
    '🎬 Add a description after <code>/video</code>\n\nExample: <code>/video waves on the shore at night</code>',

  musicGenerating: '🎵 Generating music…\n\nUsually 15–60 seconds (first run may take up to 2 min). Please wait.',
  musicDoneSending: '✅ Track ready ({seconds}s). Sending…',
  musicSent: '✅ Music sent!',
  musicGeneratedCaption: '🎵 <b>Generated music:</b>',
  musicHowTo: `🎵 <b>Text-to-music</b>

<code>/music your music description</code>

Example:
<code>/music calm lo-fi hip hop with soft piano and vinyl crackle</code>

<i>Free via Hugging Face MusicGen</i> (~10 sec WAV). Set <code>HUGGINGFACE_TOKEN</code> on Vercel.`,
  musicNotConfigured:
    '🎵 Music is disabled. Add <code>HUGGINGFACE_TOKEN</code> from huggingface.co → Settings → Access Tokens (Read).',
} as const;

export type TranslationKey = keyof typeof en;
