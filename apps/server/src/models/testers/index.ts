import type { ModelProvider } from '../models.types';
import { AnthropicTestAdapter } from './anthropic.adapter';
import { OllamaTestAdapter } from './ollama.adapter';
import { OpenAICompatibleTestAdapter } from './openai-compatible.adapter';
import type { ModelTestAdapter } from './types';

const openAICompatibleAdapter = new OpenAICompatibleTestAdapter();
const anthropicAdapter = new AnthropicTestAdapter();
const ollamaAdapter = new OllamaTestAdapter();

export function getModelTestAdapter(provider: ModelProvider): ModelTestAdapter {
  if (provider === 'anthropic') return anthropicAdapter;
  if (provider === 'ollama') return ollamaAdapter;
  return openAICompatibleAdapter;
}
