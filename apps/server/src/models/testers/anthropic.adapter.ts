import type { ModelConfig } from '../models.types';
import type { ModelTestAdapter, ModelTestProbe } from './types';
import {
  RED_PNG_BASE64,
  IMAGE_PROBE_PROMPT,
  isRedAnswer,
  parseJsonResponse,
  requestFailed,
} from './utils';

export class AnthropicTestAdapter implements ModelTestAdapter {
  async testText(model: ModelConfig): Promise<ModelTestProbe> {
    const result = await requestMessages(model, [
      { role: 'user', content: [{ type: 'text', text: 'ping' }] },
    ]);
    if (!result.ok) return result;

    const answer = extractAnthropicText(result.data);
    if (!answer) {
      return { ok: false, message: 'Model test failed: invalid response shape' };
    }
    return { ok: true, message: 'Model test passed' };
  }

  async testImage(model: ModelConfig): Promise<ModelTestProbe> {
    const result = await requestMessages(model, [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: RED_PNG_BASE64,
            },
          },
          { type: 'text', text: IMAGE_PROBE_PROMPT },
        ],
      },
    ]);
    if (!result.ok) return result;

    const answer = extractAnthropicText(result.data);
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

async function requestMessages(
  model: ModelConfig,
  messages: unknown[],
): Promise<{ ok: true; data: unknown } | { ok: false; message: string }> {
  try {
    return await parseJsonResponse(
      await fetch(`${model.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          ...(model.apiKey ? { 'x-api-key': model.apiKey } : {}),
        },
        body: JSON.stringify({
          model: model.modelId,
          max_tokens: 32,
          messages,
        }),
      }),
      model.apiKey,
    );
  } catch {
    return requestFailed();
  }
}

function extractAnthropicText(data: unknown): string {
  if (!isRecord(data) || !Array.isArray(data.content)) return '';
  return data.content
    .map((part) => (isRecord(part) && typeof part.text === 'string' ? part.text : ''))
    .join(' ')
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
