import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/api';

export type ToolView = {
  name: string;
  description: string;
  builtIn: boolean;
  enabled: boolean;
};

export type ToolPayload = ToolView;

export const listTools = () => request<ApiResponse<ToolView[]>>('/api/tools');

export const updateTool = (name: string, payload: ToolPayload) =>
  request<ApiResponse<ToolView>>(`/api/tools/${name}`, {
    method: 'PUT',
    data: payload,
  });
