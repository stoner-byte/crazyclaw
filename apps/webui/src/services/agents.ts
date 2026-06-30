import { apiRequest } from './api'

export type AgentView = {
  id: string
  description: string
  enabled: boolean
  workspaces: string[]
  tools: string[]
  systemPrompt: string
}

export type AgentPayload = {
  id: string
  description: string
  enabled: boolean
  tools: string[]
  systemPrompt: string
  workspaces?: string[]
}

export const listAgents = () => apiRequest<AgentView[]>('/api/agents')

export const createAgent = (payload: AgentPayload) =>
  apiRequest<AgentView>('/api/agents', {
    method: 'POST',
    body: payload,
  })

export const updateAgent = (id: string, payload: AgentPayload) =>
  apiRequest<AgentView>(`/api/agents/${id}`, {
    method: 'PUT',
    body: payload,
  })

export const deleteAgent = (id: string) =>
  apiRequest<{ id: string }>(`/api/agents/${id}`, {
    method: 'DELETE',
  })
