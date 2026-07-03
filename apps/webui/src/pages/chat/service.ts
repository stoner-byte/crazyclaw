import {
  OpenAIChatProvider,
  XRequest,
  type SSEOutput,
  type XModelMessage,
  type XModelParams,
} from '@ant-design/x-sdk'
import { resolveApiUrl } from '../../services/api'

export const CHAT_API_URL = resolveApiUrl('/api/chat')

export type ChatMessage = XModelMessage

export type ChatRequestParams = XModelParams & {
  agent: string
}

type CreateChatProviderOptions = Required<Pick<ChatRequestParams, 'agent' | 'model'>>

/**
 * Factory - call once per selected agent/model pair.
 * OpenAIChatProvider handles SSE parsing and history accumulation internally.
 */
export function createChatProvider({
  agent,
  model,
}: CreateChatProviderOptions) {
  return new OpenAIChatProvider<ChatMessage, ChatRequestParams, SSEOutput>({
    request: XRequest<ChatRequestParams, SSEOutput, ChatMessage>(CHAT_API_URL, {
      manual: true,
      params: {
        agent,
        model,
        stream: true,
      },
    }),
  })
}
