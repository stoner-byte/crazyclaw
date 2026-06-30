import { apiRequest } from './api'

export type ToolView = {
  name: string
  description: string
  builtIn: boolean
  enabled: boolean
}

export const listTools = () => apiRequest<ToolView[]>('/api/tools')
