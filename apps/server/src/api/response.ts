import type { ApiResponse } from './types';

export function apiOk<T>(data: T, message: string): ApiResponse<T> {
  return { code: 0, data, message };
}

export function apiFail<T = never>(
  code: number,
  message: string,
): ApiResponse<T> {
  return { code, data: null, message };
}

export function apiBadRequest<T = never>(
  code: number,
  message: string,
): ApiResponse<T> {
  return apiFail<T>(code, message);
}
