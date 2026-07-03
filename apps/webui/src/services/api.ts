export type ApiResponse<T> = {
  code: number
  data: T | null
  message: string
}

type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export function resolveApiUrl(path: string) {
  if (!apiBaseUrl) return path
  return `${apiBaseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(resolveApiUrl(path), {
      method: options.method ?? 'GET',
      headers:
        options.body === undefined
          ? undefined
          : { 'Content-Type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })

    const payload = (await response.json().catch(() => null)) as
      | ApiResponse<T>
      | null

    if (payload && typeof payload.code === 'number') {
      return payload
    }

    return {
      code: response.status,
      data: null,
      message: response.ok ? 'Request succeeded' : response.statusText,
    }
  } catch (error) {
    return {
      code: -1,
      data: null,
      message: error instanceof Error ? error.message : 'Network request failed',
    }
  }
}
