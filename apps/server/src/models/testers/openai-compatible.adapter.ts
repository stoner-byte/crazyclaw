import type { ModelConfig } from '../models.types';
import type { ModelTestAdapter, ModelTestProbe } from './types';
import {
  RED_PNG_BASE64,
  IMAGE_PROBE_PROMPT,
  isRedAnswer,
  parseJsonResponse,
  requestFailed,
} from './utils';

export class OpenAICompatibleTestAdapter implements ModelTestAdapter {
  async testText(model: ModelConfig): Promise<ModelTestProbe> {
    const result = await requestChatCompletions(model, [
      { role: 'user', content: 'ping' },
    ]);
    if (!result.ok) return result;

    const answer = extractOpenAIText(result.data);
    if (!answer) {
      return { ok: false, message: 'Model test failed: invalid response shape' };
    }
    return { ok: true, message: 'Model test passed' };
  }

  async testImage(model: ModelConfig): Promise<ModelTestProbe> {
    const result = await requestChatCompletions(model, [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${RED_PNG_BASE64}` },
          },
          { type: 'text', text: IMAGE_PROBE_PROMPT },
        ],
      },
    ]);
    if (!result.ok) return result;

    const answer = extractOpenAIText(result.data);
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

async function requestChatCompletions(
  model: ModelConfig,
  messages: unknown[],
): Promise<{ ok: true; data: unknown } | { ok: false; message: string }> {
  try {
    return await parseJsonResponse(
      await fetch(`${model.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(model.apiKey ? { Authorization: `Bearer ${model.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: model.modelId,
          messages,
          max_tokens: 32,
          stream: false,
        }),
      }),
      model.apiKey,
    );
  } catch {
    return requestFailed();
  }
}

function extractOpenAIText(data: unknown): string {
  if (!isRecord(data)) return '';
  const choices = data.choices;
  if (!Array.isArray(choices)) return '';

  return choices
    .map((choice) => {
      if (!isRecord(choice)) return '';
      if (typeof choice.text === 'string') return choice.text;
      const message = choice.message;
      if (!isRecord(message)) return '';
      const content = message.content;
      if (typeof content === 'string') return content;
      if (Array.isArray(content)) {
        return content
          .map((part) => (isRecord(part) && typeof part.text === 'string' ? part.text : ''))
          .join(' ');
      }
      return '';
    })
    .join(' ')
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
