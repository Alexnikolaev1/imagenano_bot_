export const en = {
  welcome: `👋 <b>Welcome to Imagnano!</b>

I create and edit images with Google Gemini AI.

<b>Quick start:</b>
• Send any text — I'll generate an image
• <code>/generate sunset over Tokyo, cyberpunk</code>
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
} as const;

export type TranslationKey = keyof typeof en;
