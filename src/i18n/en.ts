export const en = {
  welcome: `👋 <b>Welcome to Imagnano!</b>

I create images (Cloudflare Flux), video via your Colab (when PC is on), free GIF clips, and music (Hugging Face).

<b>Quick start:</b>
• Send any text — I'll generate an image
• <code>/generate sunset over Tokyo, cyberpunk</code>
• <code>/video a cat walking in snow</code> — MP4 via Colab (5/day, PC must be on)
• <code>/videogif waves on the beach</code> — free GIF (10/day)
• Photo + <code>/video gentle zoom</code> — animate photo (Colab)
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

<b>Video MP4 (Colab on your PC):</b>
/video &lt;prompt&gt;
Photo + caption <code>/video …</code>
Needs <code>VIDEO_API</code> (ngrok). Limit: 5/day

<b>Video GIF (free, Cloudflare):</b>
/videogif &lt;prompt&gt;
Limit: 10 per day

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
  videoHowTo: `🎬 <b>MP4 video (your Colab + ngrok)</b>

<code>/video description of the scene</code>

Example:
<code>/video a golden retriever running on a beach at sunset</code>

<b>From photo:</b> send a photo with caption:
<code>/video slow zoom, wind in the leaves</code>

The bot sends your image to Colab. <b>Keep Colab running</b> and update <code>VIDEO_API</code> when ngrok URL changes.

<i>Text prompts:</i> a keyframe is generated via Cloudflare first, then animated in Colab.

Limit: 5 MP4 per day. Free GIF: <code>/videogif</code>.`,
  colabNotConfigured:
    '🎬 <b>Colab video is off.</b>\n\nAdd <code>VIDEO_API=https://….ngrok-free.app/generate_video/</code> on the server (from your running Colab notebook).\n\nFree alternative: <code>/videogif</code>',
  videoGifHowTo: `🎞 <b>Free looping GIF (Cloudflare)</b>

<code>/videogif your scene description</code>
(same as <code>/video</code>)

Example:
<code>/videogif a cat on a windowsill, rain outside, cozy mood</code>

<b>From photo:</b> send a photo with caption:
<code>/videogif gentle breeze, hair moving slightly</code>

<i>Limit:</i> 10 GIF clips per day. No extra API keys beyond Cloudflare.`,
  videoGifGenerating: '🎞 Generating video clip…\n\nUsually 30–90 seconds.',
  videoGifFromImage: '🎞 Animating your photo…\n\nUsually 30–90 seconds.',
  needVideoGifPrompt:
    '🎞 Add a description after the command\n\nExample: <code>/video waves on the shore at night</code>',
  videoNotConfigured:
    '🎞 <b>Video is disabled.</b>\n\nSet <code>VIDEO_API</code> for Colab MP4 or ensure Cloudflare keys work for <code>/videogif</code>.',
  needVideoPrompt:
    '🎞 Add a description after <code>/video</code>\n\nExample: <code>/video waves on the shore at night</code>',

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
