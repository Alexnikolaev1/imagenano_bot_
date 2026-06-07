import type { Lang } from '../i18n';
import { parseCloudflareError } from './cloudflareModel';

export function errorMessage(errorCode: string, resetIn?: number, lang: Lang = 'ru'): string {
  const isRu = lang === 'ru';

  switch (errorCode) {
    case 'rate_limit':
      return isRu
        ? '⏳ <b>Достигнут лимит запросов.</b>\n\nПодождите немного и попробуйте снова.'
        : '⏳ <b>Rate limit reached.</b>\n\nWait a moment and try again.';

    case 'need_instruction':
      return isRu
        ? '✏️ <b>Нужна подпись к фото.</b>\n\nНапример: <code>дорисуй кошку</code> или <code>/edit фиолетовое небо</code>'
        : '✏️ <b>Caption required.</b>\n\nExample: <code>add a cat</code> or <code>/edit purple sky</code>';

    case 'auth_error':
      return isRu
        ? '🔑 <b>Ошибка API-ключа.</b>\n\nСвяжитесь с администратором бота.'
        : '🔑 <b>API authentication error.</b>\n\nContact the bot administrator.';

    case 'safety_block':
      return isRu
        ? '🚫 <b>Запрос заблокирован фильтрами безопасности.</b>\n\nПопробуйте другой запрос или изображение.'
        : '🚫 <b>Request blocked by safety filters.</b>\n\nTry a different prompt or image.';

    case 'user_rate_limit': {
      const hours = resetIn ? Math.ceil(resetIn / 3600) : 24;
      return isRu
        ? `⏰ <b>Дневной лимит исчерпан.</b>\n\nСброс через ~${hours} ч.`
        : `⏰ <b>Daily limit reached.</b>\n\nResets in ~${hours} hour${hours !== 1 ? 's' : ''}.`;
    }

    case 'video_rate_limit': {
      const hours = resetIn ? Math.ceil(resetIn / 3600) : 24;
      return isRu
        ? `⏰ <b>Дневной лимит видео исчерпан.</b>\n\nСброс через ~${hours} ч.`
        : `⏰ <b>Daily video limit reached.</b>\n\nResets in ~${hours} hour${hours !== 1 ? 's' : ''}.`;
    }

    case 'video_gif_rate_limit': {
      const hours = resetIn ? Math.ceil(resetIn / 3600) : 24;
      return isRu
        ? `⏰ <b>Дневной лимит GIF-видео исчерпан.</b>\n\nСброс через ~${hours} ч.`
        : `⏰ <b>Daily GIF video limit reached.</b>\n\nResets in ~${hours} hour${hours !== 1 ? 's' : ''}.`;
    }

    case 'colab_video_rate_limit': {
      const hours = resetIn ? Math.ceil(resetIn / 3600) : 24;
      return isRu
        ? `⏰ <b>Дневной лимит MP4 (Colab) исчерпан.</b>\n\nСброс через ~${hours} ч.`
        : `⏰ <b>Daily Colab MP4 limit reached.</b>\n\nResets in ~${hours} hour${hours !== 1 ? 's' : ''}.`;
    }

    case 'colab_not_found':
      return isRu
        ? '🔍 <b>Адрес Colab не найден (404).</b>\n\n1. Запустите Colab + ngrok на ПК\n2. Скопируйте <b>новый</b> URL из ngrok\n3. На Vercel: <code>VIDEO_API=https://….ngrok-free.app/generate_video/</code>\n4. Redeploy\n\nВ логах Vercel ищите строку <code>Colab video API endpoints</code> — там видно, куда бот стучится.'
        : '🔍 <b>Colab endpoint not found (404).</b>\n\n1. Start Colab + ngrok on your PC\n2. Copy the <b>new</b> ngrok URL\n3. On Vercel: <code>VIDEO_API=https://….ngrok-free.app/generate_video/</code>\n4. Redeploy\n\nCheck Vercel logs for <code>Colab video API endpoints</code>.';

    case 'colab_ngrok_page':
      return isRu
        ? '🌐 <b>ngrok вернул HTML вместо API (404).</b>\n\nТуннель, скорее всего, <b>устарел</b>. Перезапустите ngrok, обновите <code>VIDEO_API</code> на Vercel и сделайте Redeploy.'
        : '🌐 <b>ngrok returned HTML instead of the API (404).</b>\n\nThe tunnel is probably <b>expired</b>. Restart ngrok, update <code>VIDEO_API</code> on Vercel, and redeploy.';

    case 'colab_offline':
      return isRu
        ? '💻 <b>Colab/ngrok недоступен.</b>\n\nВключите ноутбук в Colab, запустите ячейку с сервером и обновите <code>VIDEO_API</code> на Vercel, если сменился URL ngrok.'
        : '💻 <b>Colab/ngrok is unreachable.</b>\n\nStart the Colab notebook, run the server cell, and update <code>VIDEO_API</code> on Vercel if the ngrok URL changed.';

    case 'colab_timeout':
      return isRu
        ? '⏳ <b>Colab не успел сгенерировать видео.</b>\n\nПопробуйте проще сцену или увеличьте <code>VIDEO_API_TIMEOUT_MS</code>.'
        : '⏳ <b>Colab video timed out.</b>\n\nTry a simpler scene or increase <code>VIDEO_API_TIMEOUT_MS</code>.';

    case 'colab_server_error':
      return isRu
        ? '⚠️ <b>Ошибка на стороне Colab (500).</b>\n\nПроверьте вывод ячейки в ноутбуке — возможно, не хватает VRAM или модель упала.'
        : '⚠️ <b>Colab server error (500).</b>\n\nCheck the notebook cell output — model may have crashed or run out of VRAM.';

    case 'colab_bad_request':
      return isRu
        ? '🖼 <b>Colab не принял изображение.</b>\n\nОтправьте фото с подписью <code>/video …</code> или попробуйте другой промпт.'
        : '🖼 <b>Colab rejected the image.</b>\n\nSend a photo with <code>/video …</code> caption or try another prompt.';

    case 'colab_no_video':
    case 'colab_empty_video':
    case 'colab_bad_response':
      return isRu
        ? '🎬 <b>Colab вернул пустой ответ.</b>\n\nПроверьте, что endpoint <code>/generate_video/</code> отдаёт MP4.'
        : '🎬 <b>Colab returned no video.</b>\n\nEnsure <code>/generate_video/</code> returns an MP4 file.';

    case 'colab_image_failed':
      return isRu
        ? '🎨 <b>Не удалось создать кадр для видео (Cloudflare).</b>\n\nПопробуйте короче промпт.'
        : '🎨 <b>Could not create keyframe for video (Cloudflare).</b>\n\nTry a shorter prompt.';

    case 'hf_video_rate_limit': {
      const hours = resetIn ? Math.ceil(resetIn / 3600) : 24;
      return isRu
        ? `⏰ <b>Дневной лимит MP4 (HF Space) исчерпан.</b>\n\nСброс через ~${hours} ч.`
        : `⏰ <b>Daily HF Space MP4 limit reached.</b>\n\nResets in ~${hours} hour${hours !== 1 ? 's' : ''}.`;
    }

    case 'hf_space_sleeping':
      return isRu
        ? '⏳ <b>Space на Hugging Face ещё просыпается.</b>\n\nОткройте <a href="https://huggingface.co/spaces/alex555196/videobot">videobot</a> и дождитесь Running, затем повторите.\n\nZeroGPU может ставить в очередь 1–3 мин.'
        : '⏳ <b>Hugging Face Space is still waking up.</b>\n\nOpen <a href="https://huggingface.co/spaces/alex555196/videobot">videobot</a> and wait until Running, then try again.\n\nZeroGPU may queue for 1–3 min.';

    case 'hf_space_timeout':
      return isRu
        ? '⏳ <b>HF Space не успел сгенерировать видео.</b>\n\nПопробуйте проще сцену или увеличьте <code>HF_VIDEO_TIMEOUT_MS</code>.'
        : '⏳ <b>HF Space video timed out.</b>\n\nTry a simpler scene or increase <code>HF_VIDEO_TIMEOUT_MS</code>.';

    case 'hf_space_no_video':
    case 'hf_space_bad_response':
      return isRu
        ? '🎬 <b>Space вернул пустой ответ.</b>\n\nПроверьте логи Space на Hugging Face — возможно, OOM или ошибка модели.'
        : '🎬 <b>Space returned no video.</b>\n\nCheck Space logs on Hugging Face — model may have crashed or run out of VRAM.';

    case 'hf_space_upload_failed':
      return isRu
        ? '🖼 <b>Не удалось загрузить фото в Space.</b>\n\nПопробуйте текстовый <code>/video …</code> или отправьте фото поменьше.'
        : '🖼 <b>Could not upload photo to Space.</b>\n\nTry text <code>/video …</code> or send a smaller photo.';

    case 'hf_space_error':
      return isRu
        ? '⚠️ <b>Ошибка HF Space.</b>\n\nПроверьте, что Space Running и <code>HF_VIDEO_SPACE</code> указан верно.'
        : '⚠️ <b>HF Space error.</b>\n\nEnsure the Space is Running and <code>HF_VIDEO_SPACE</code> is correct.';

    case 'video_not_configured':
      return isRu
        ? '🎞 <b>Видео не настроено.</b>\n\nПроверьте ключи Cloudflare на сервере (<code>CLOUDFLARE_ACCOUNT_ID</code>, <code>CLOUDFLARE_API_TOKEN</code>).'
        : '🎞 <b>Video is not configured.</b>\n\nCheck Cloudflare keys on the server (<code>CLOUDFLARE_ACCOUNT_ID</code>, <code>CLOUDFLARE_API_TOKEN</code>).';

    case 'modelscope_daily_limit':
      return isRu
        ? '⏰ <b>Исчерпана дневная квота ModelScope API</b> (~2000 вызовов/сутки, сброс в 00:00 UTC+8).\n\nПопробуйте завтра. Для видео бот отправит GIF через Cloudflare (если включён fallback).'
        : '⏰ <b>ModelScope daily API quota reached</b> (~2000 calls/day, resets 00:00 UTC+8).\n\nTry tomorrow. For video, the bot falls back to a Cloudflare GIF when enabled.';

    case 'modelscope_alibaba_bind_required':
      return isRu
        ? '☁️ <b>ModelScope требует привязку Alibaba Cloud.</b>\n\nЭто не DashScope и не оплата — просто верификация аккаунта на modelscope.cn:\n1. Войдите на <b>modelscope.cn</b>\n2. Профиль → привязать <b>Alibaba Cloud</b>\n3. Повторите запрос\n\n<b>Видео без этого:</b> в Vercel поставьте <code>VIDEO_PROVIDER=cloudflare_gif</code> (бесплатный GIF, только ключи Cloudflare).'
        : '☁️ <b>ModelScope requires an Alibaba Cloud account link.</b>\n\nThis is not DashScope billing — just account verification on modelscope.cn:\n1. Log in at <b>modelscope.cn</b>\n2. Profile → bind <b>Alibaba Cloud</b>\n3. Try again\n\n<b>Video without that:</b> set <code>VIDEO_PROVIDER=cloudflare_gif</code> on Vercel (free GIF, Cloudflare keys only).';

    case 'modelscope_auth_error':
      return isRu
        ? '🔑 <b>Неверный ModelScope token.</b>\n\nПроверьте <code>MODELSCOPE_API_TOKEN</code> (ms-…) на modelscope.cn → Access tokens.'
        : '🔑 <b>Invalid ModelScope token.</b>\n\nCheck <code>MODELSCOPE_API_TOKEN</code> (ms-…) at modelscope.cn → Access tokens.';

    case 'modelscope_no_video_model':
      return isRu
        ? '🎬 <b>Модель Wan не доступна через бесплатный API Inference.</b>\n\nНа modelscope.cn выберите модель с бейджем <b>API-Inference</b> и укажите её ID в <code>MODELSCOPE_T2V_MODEL</code> / <code>MODELSCOPE_I2V_MODEL</code>.\n\nИли поставьте <code>VIDEO_PROVIDER=cloudflare_preview</code> — бесплатный кино-кадр (не mp4).'
        : '🎬 <b>Wan model is not on the free API-Inference tier.</b>\n\nPick a model with the <b>API-Inference</b> badge on modelscope.cn and set <code>MODELSCOPE_T2V_MODEL</code> / <code>MODELSCOPE_I2V_MODEL</code>.\n\nOr set <code>VIDEO_PROVIDER=cloudflare_preview</code> for a free cinematic still (not mp4).';

    case 'video_timeout':
      return isRu
        ? '⏳ <b>Видео не успело сгенерироваться за отведённое время.</b>\n\nПопробуйте короче промпт или позже.'
        : '⏳ <b>Video generation timed out.</b>\n\nTry a shorter prompt or try again later.';

    case 'need_video_prompt':
      return isRu
        ? '🎬 <b>Нужно описание для видео.</b>\n\nПример:\n<code>/video кот идёт по снегу, кинематографично</code>'
        : '🎬 <b>Video prompt required.</b>\n\nExample:\n<code>/video a cat walking in snow, cinematic</code>';

    case 'music_rate_limit': {
      const hours = resetIn ? Math.ceil(resetIn / 3600) : 24;
      return isRu
        ? `⏰ <b>Дневной лимит музыки исчерпан.</b>\n\nСброс через ~${hours} ч.`
        : `⏰ <b>Daily music limit reached.</b>\n\nResets in ~${hours} hour${hours !== 1 ? 's' : ''}.`;
    }

    case 'modelscope_no_music_model':
      return isRu
        ? '🎵 <b>MusicGen недоступен через API Inference.</b>\n\nПроверьте <code>MODELSCOPE_MUSIC_MODEL=AI-ModelScope/musicgen-small</code> на modelscope.cn (бейдж API-Inference).'
        : '🎵 <b>MusicGen is not available on API Inference.</b>\n\nCheck <code>MODELSCOPE_MUSIC_MODEL=AI-ModelScope/musicgen-small</code> on modelscope.cn (API-Inference badge).';

    case 'music_timeout':
      return isRu
        ? '⏳ <b>Музыка не успела сгенерироваться за отведённое время.</b>\n\nПопробуйте короче промпт или позже.'
        : '⏳ <b>Music generation timed out.</b>\n\nTry a shorter prompt or try again later.';

    case 'music_not_configured':
      return isRu
        ? '🎵 <b>Музыка не настроена.</b>\n\nДобавьте <code>HUGGINGFACE_TOKEN</code> (huggingface.co → Settings → Access Tokens).'
        : '🎵 <b>Music is not configured.</b>\n\nAdd <code>HUGGINGFACE_TOKEN</code> (huggingface.co → Settings → Access Tokens).';

    case 'hf_model_loading':
      return isRu
        ? '⏳ <b>Модель Hugging Face прогревается.</b>\n\nПервый запрос может занять 1–2 минуты. Попробуйте ещё раз через минуту.'
        : '⏳ <b>Hugging Face model is warming up.</b>\n\nFirst request can take 1–2 minutes. Try again in a minute.';

    case 'hf_auth_error':
      return isRu
        ? '🔑 <b>Неверный Hugging Face token.</b>\n\nПроверьте <code>HUGGINGFACE_TOKEN</code> на huggingface.co (нужен Read).'
        : '🔑 <b>Invalid Hugging Face token.</b>\n\nCheck <code>HUGGINGFACE_TOKEN</code> on huggingface.co (Read scope).';

    case 'hf_timeout':
      return isRu
        ? '⏳ <b>Hugging Face не ответил вовремя.</b>\n\nМодель могла быть холодной — попробуйте снова.'
        : '⏳ <b>Hugging Face timed out.</b>\n\nThe model may have been cold — try again.';

    case 'need_music_prompt':
      return isRu
        ? '🎵 <b>Нужно описание музыки.</b>\n\nПример:\n<code>/music calm lo-fi jazz with piano</code>'
        : '🎵 <b>Music prompt required.</b>\n\nExample:\n<code>/music calm lo-fi jazz with piano</code>';

    case 'cloudflare_model_not_found':
      return isRu
        ? '🎬 <b>Модель Cloudflare не найдена (404).</b>\n\nПроверьте на Vercel:\n<code>CLOUDFLARE_IMAGE_MODEL=@cf/black-forest-labs/flux-1-schnell</code>\n<code>CLOUDFLARE_EDIT_IMAGE_MODEL=@cf/black-forest-labs/flux-2-klein-4b</code>'
        : '🎬 <b>Cloudflare model not found (404).</b>\n\nCheck on Vercel:\n<code>CLOUDFLARE_IMAGE_MODEL=@cf/black-forest-labs/flux-1-schnell</code>\n<code>CLOUDFLARE_EDIT_IMAGE_MODEL=@cf/black-forest-labs/flux-2-klein-4b</code>';

    case 'cloudflare_unsupported_input':
      return isRu
        ? '🎬 <b>Cloudflare отклонил запрос (Unsupported input).</b>\n\nЧасто это неверная модель или формат. Для видео-GIF используйте flux-1-schnell + flux-2-klein-4b (см. .env.example).'
        : '🎬 <b>Cloudflare rejected the request (Unsupported input).</b>\n\nUsually wrong model or format. For GIF video use flux-1-schnell + flux-2-klein-4b (see .env.example).';

    case 'gif_failed':
      return isRu
        ? '🎬 <b>Не удалось собрать GIF-клип.</b>\n\nПопробуйте другой промпт или позже.'
        : '🎬 <b>Could not build the GIF clip.</b>\n\nTry a different prompt or try again later.';

    default: {
      if (/bind.*alibaba|alibaba cloud account/i.test(errorCode)) {
        return errorMessage('modelscope_alibaba_bind_required', resetIn, lang);
      }
      if (/nsfw|3030/i.test(errorCode)) {
        return errorMessage('safety_block', resetIn, lang);
      }
      const cfCode = parseCloudflareError(0, errorCode);
      if (cfCode !== errorCode && cfCode !== 'Cloudflare AI error 0') {
        return errorMessage(cfCode, resetIn, lang);
      }
      return isRu
        ? `❌ <b>Ошибка.</b>\n\n<code>${escapeHtml(errorCode.slice(0, 200))}</code>\n\nПопробуйте позже.`
        : `❌ <b>Something went wrong.</b>\n\n<code>${escapeHtml(errorCode.slice(0, 200))}</code>\n\nTry again later.`;
    }
  }
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
