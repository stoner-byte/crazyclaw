export const RED_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAJ0lEQVR42u3NsQkAAAjAsP7/tF7hIASyp6lTCQQCgUAgEAgEgi/BAjLD/C5w/SM9AAAAAElFTkSuQmCC';

export const IMAGE_PROBE_PROMPT =
  'What is the single dominant color of this image? Reply with ONLY the color name, nothing else.';

const RED_KEYWORDS = ['red', 'scarlet', 'crimson', 'vermilion', 'maroon', '红'];
const MAX_ERROR_BODY_LENGTH = 200;

export function isRedAnswer(answer: string): boolean {
  const normalized = answer.toLowerCase();
  return RED_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function isMediaUnsupportedError(message: string): boolean {
  const normalized = message.toLowerCase();
  return [
    'image',
    'video',
    'vision',
    'multimodal',
    'image_url',
    'video_url',
    'does not support',
  ].some((keyword) => normalized.includes(keyword));
}

export async function parseJsonResponse(
  response: Response,
  apiKey?: string,
): Promise<{ ok: true; data: unknown } | { ok: false; message: string }> {
  const body = await readResponseText(response);
  if (!response.ok) {
    return {
      ok: false,
      message: `Model test failed: ${response.status} ${summarizeErrorBody(
        body,
        apiKey,
      )}`.trim(),
    };
  }

  try {
    return { ok: true, data: JSON.parse(body || '{}') };
  } catch {
    return { ok: false, message: 'Model test failed: invalid response shape' };
  }
}

export async function readResponseText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

export function summarizeErrorBody(body: string, secret?: string): string {
  const redacted = redactSecret(body, secret).replace(/\s+/g, ' ').trim();
  if (!redacted) return '';
  if (redacted.length <= MAX_ERROR_BODY_LENGTH) return redacted;
  return `${redacted.slice(0, MAX_ERROR_BODY_LENGTH)}...`;
}

export function redactSecret(value: string, secret?: string): string {
  if (!secret) return value;
  return value.split(secret).join('[REDACTED]');
}

export function requestFailed(): { ok: false; message: string } {
  return { ok: false, message: 'Model test failed: request failed' };
}
