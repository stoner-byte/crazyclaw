export const MODEL_PROVIDERS = [
  'openai',
  'deepseek',
  'dashscope',
  'kimi-cn',
  'kimi-codingplan',
  'anthropic',
  'ollama',
] as const;

export type ModelProvider = (typeof MODEL_PROVIDERS)[number];

export const MODEL_INPUTS = ['text', 'image', 'video'] as const;

export type ModelInput = (typeof MODEL_INPUTS)[number];

export type ModelConfig = {
  id: string;
  provider: ModelProvider;
  modelId: string;
  enabled: boolean;
  baseUrl: string;
  apiKey?: string;
  input: ModelInput[];
};

export type ModelView = Omit<ModelConfig, 'apiKey'> & {
  hasApiKey: boolean;
  maskedApiKey: string;
};

export type ModelPayload = {
  id: string;
  provider?: unknown;
  modelId?: unknown;
  enabled?: unknown;
  baseUrl?: unknown;
  apiKey?: unknown;
  input?: unknown;
};

export type ModelTestPayload = {
  mode?: unknown;
};

export type ModelTestMode = 'text' | 'image';

export type ModelTestResult = {
  id: string;
  provider: ModelProvider;
  mode: ModelTestMode;
  ok: boolean;
  durationMs: number;
  message: string;
};

export const MODEL_CODES = {
  OK: 0,
  NOT_FOUND: 1101,
  ALREADY_EXISTS: 1102,
  BAD_REQUEST: 1103,
  TEST_FAILED: 1104,
  CONFIG_IO_ERROR: 1105,
  UNSUPPORTED_TEST_MODE: 1106,
} as const;
