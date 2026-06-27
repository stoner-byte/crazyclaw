import type { ModelConfig } from '../models.types';
import type { ModelTestAdapter, ModelTestProbe } from './types';
import {
  RED_PNG_BASE64,
  IMAGE_PROBE_PROMPT,
  isRedAnswer,
  parseJsonResponse,
  requestFailed,
} from './utils';

export class OllamaTestAdapter implements ModelTestAdapter {
  async testText(model: ModelConfig): Promise<ModelTestProbe> {
    const result = await requestOllama(model, {
      role: 'user',
      content: 'ping',
    });
    if (!result.ok) return result;

    const answer = extractOllamaText(result.data);
    if (!answer) {
      return { ok: false, message: 'Model test failed: invalid response shape' };
    }
    return { ok: true, message: 'Model test passed' };
  }

  async testImage(model: ModelConfig): Promise<ModelTestProbe> {
    const result = await requestOllama(model, {
      role: 'user',
      content: IMAGE_PROBE_PROMPT,
      images: [RED_PNG_BASE64],
    });
    if (!result.ok) return result;

    const answer = extractOllamaText(result.data);
    if (!answer) {
      return { ok: false, message: 'Model test failed: invalid response shape' };
    }
    if (!isRedAnswer(answer)) {
      return {
        ok: false,
        message: 'Image test failed: model did not recognize the red image',
      };
    }
    return { ok: true, message: 'Model test passed' };
  }
}

async function requestOllama(
  model: ModelConfig,
  message: unknown,
): Promise<{ ok: true; data: unknown } | { ok: false; message: string }> {
  try {
    return await parseJsonResponse(
      await fetch(`${normalizeOllamaBaseUrl(model.baseUrl)}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.modelId,
          messages: [message],
          stream: false,
        }),
      }),
      model.apiKey,
    );
  } catch {
    return requestFailed();
  }
}

function normalizeOllamaBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
}

function extractOllamaText(data: unknown): string {
  if (!isRecord(data)) return '';
  if (typeof data.response === 'string') return data.response.trim();
  const message = data.message;
  if (isRecord(message) && typeof message.content === 'string') {
    return message.content.trim();
  }
  return '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
