import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/api';

export type AgentView = {
  id: string;
  description: string;
  enabled: boolean;
  workspaces: string[];
  tools: string[];
  systemPrompt: string;
};

export type AgentPayload = {
  id: string;
  description: string;
  enabled: boolean;
  tools: string[];
  systemPrompt: string;
  workspaces?: string[];
};

export const listAgents = () => request<ApiResponse<AgentView[]>>('/api/agents');

export const createAgent = (payload: AgentPayload) =>
  request<ApiResponse<AgentView>>('/api/agents', {
    method: 'POST',
    data: payload,
  });

export const updateAgent = (id: string, payload: AgentPayload) =>
  request<ApiResponse<AgentView>>(`/api/agents/${id}`, {
    method: 'PUT',
    data: payload,
  });

export const deleteAgent = (id: string) =>
  request<ApiResponse<{ id: string }>>(`/api/agents/${id}`, {
    method: 'DELETE',
  });
