import { apiRequest } from './api'

export type ModelProvider =
  | 'openai'
  | 'deepseek'
  | 'dashscope'
  | 'kimi-cn'
  | 'kimi-codingplan'
  | 'anthropic'
  | 'ollama'

export type ModelInput = 'text' | 'image' | 'video'

export type ModelView = {
  id: string
  provider: ModelProvider
  modelId: string
  enabled: boolean
  baseUrl: string
  input: ModelInput[]
  hasApiKey: boolean
  maskedApiKey: string
}

export type ModelPayload = {
  id: string
  provider: ModelProvider
  modelId: string
  enabled: boolean
  baseUrl: string
  apiKey: string
  input: ModelInput[]
}

export type ModelTestPayload = {
  mode: 'text' | 'image'
}

export type ModelTestResult = {
  id: string
  provider: ModelProvider
  mode: 'text' | 'image'
  ok: boolean
  durationMs: number
  message: string
}

export const listModels = () => apiRequest<ModelView[]>('/api/models')

export const createModel = (payload: ModelPayload) =>
  apiRequest<ModelView>('/api/models', {
    method: 'POST',
    body: payload,
  })

export const updateModel = (id: string, payload: ModelPayload) =>
  apiRequest<ModelView>(`/api/models/${id}`, {
    method: 'PUT',
    body: payload,
  })

export const deleteModel = (id: string) =>
  apiRequest<{ id: string }>(`/api/models/${id}`, {
    method: 'DELETE',
  })

export const testModel = (id: string, payload: ModelTestPayload) =>
  apiRequest<ModelTestResult>(`/api/models/${id}/test`, {
    method: 'POST',
    body: payload,
  })
