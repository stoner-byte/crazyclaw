import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/api';

export type ModelProvider =
  | 'openai'
  | 'deepseek'
  | 'dashscope'
  | 'kimi-cn'
  | 'kimi-codingplan'
  | 'anthropic'
  | 'ollama';

export type ModelInput = 'text' | 'image' | 'video';

export type ModelView = {
  id: string;
  provider: ModelProvider;
  modelId: string;
  enabled: boolean;
  baseUrl: string;
  input: ModelInput[];
  hasApiKey: boolean;
  maskedApiKey: string;
};

export type ModelPayload = {
  id: string;
  provider: ModelProvider;
  modelId: string;
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  input: ModelInput[];
};

export type ModelTestPayload = {
  mode: 'text' | 'image';
};

export type ModelTestResult = {
  id: string;
  provider: ModelProvider;
  mode: 'text' | 'image';
  ok: boolean;
  durationMs: number;
  message: string;
};

export const listModels = () => request<ApiResponse<ModelView[]>>('/api/models');

export const createModel = (payload: ModelPayload) =>
  request<ApiResponse<ModelView>>('/api/models', {
    method: 'POST',
    data: payload,
  });

export const updateModel = (id: string, payload: ModelPayload) =>
  request<ApiResponse<ModelView>>(`/api/models/${id}`, {
    method: 'PUT',
    data: payload,
  });

export const deleteModel = (id: string) =>
  request<ApiResponse<{ id: string }>>(`/api/models/${id}`, {
    method: 'DELETE',
  });

export const testModel = (id: string, payload: ModelTestPayload) =>
  request<ApiResponse<ModelTestResult>>(`/api/models/${id}/test`, {
    method: 'POST',
    data: payload,
  });
