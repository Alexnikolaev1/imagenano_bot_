// Shared ModelScope API error normalization

export function extractModelScopeMessage(body: Record<string, unknown>): string {
  const errors = body.errors as Record<string, unknown> | undefined;
  return String(
    errors?.message ||
      body.message ||
      body.error ||
      ''
  );
}

/** Map raw API text to stable bot error codes */
export function normalizeModelScopeError(raw: string, httpStatus?: number): string {
  const msg = raw.trim();
  const lower = msg.toLowerCase();

  if (/bind.*alibaba|alibaba cloud account/i.test(lower)) {
    return 'modelscope_alibaba_bind_required';
  }
  if (httpStatus === 429 || /rate limit|quota|too many/i.test(lower)) {
    return 'modelscope_daily_limit';
  }
  if (/invalid model|model id|not found|unsupported|not exist/i.test(lower)) {
    return 'modelscope_model_unavailable';
  }
  if (/authentication failed|invalid.*token|unauthorized/i.test(lower)) {
    return 'modelscope_auth_error';
  }

  return msg || `ModelScope HTTP ${httpStatus ?? 'error'}`;
}
