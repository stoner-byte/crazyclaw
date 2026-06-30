import { apiRequest } from './api'

export type ToolView = {
  name: string
  description: string
  builtIn: boolean
  enabled: boolean
}

export type ToolPayload = ToolView

export const listTools = () => apiRequest<ToolView[]>('/api/tools')

export const updateTool = (name: string, payload: ToolPayload) =>
  apiRequest<ToolView>(`/api/tools/${name}`, {
    method: 'PUT',
    body: payload,
  })
