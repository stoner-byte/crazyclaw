import { Bubble, Sender, Think, type BubbleListProps } from '@ant-design/x'
import { useXChat, type MessageInfo } from '@ant-design/x-sdk'
import { XMarkdown } from '@ant-design/x-markdown'
import {
  App as AntApp,
  Dropdown,
  Flex,
  Space,
  Spin,
  type MenuProps,
} from 'antd'
import { Bot, BrainCircuit } from 'lucide-react'
import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { listAgents, type AgentView } from '../../services/agents'
import { listModels, type ModelView } from '../../services/models'
import {
  createChatProvider,
  type ChatMessage,
  type ChatRequestParams,
} from './service'
import styles from './styles.module.css'

const REQUEST_PLACEHOLDER: ChatMessage = { role: 'assistant', content: '' }
const SenderSwitch = Sender.Switch

type DropdownSwitchProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  children: ReactNode
  disabled?: boolean
  icon: ReactNode
}

const DropdownSwitch = forwardRef<HTMLDivElement, DropdownSwitchProps>(
  ({ children, className, disabled, icon, ...props }, ref) => (
    <div
      {...props}
      ref={ref}
      className={[styles.switchTrigger, className].filter(Boolean).join(' ')}
      tabIndex={-1}
    >
      <SenderSwitch disabled={disabled} icon={icon} value={false}>
        {children}
      </SenderSwitch>
    </div>
  ),
)

DropdownSwitch.displayName = 'DropdownSwitch'

function getMessageContent(message?: ChatMessage) {
  if (!message) return ''
  const { content } = message
  return typeof content === 'string' ? content : content.text
}

function splitThink(content: string) {
  const open = content.indexOf('<think>')
  if (open < 0) return { answer: content, thinking: '' }

  const close = content.indexOf('</think>', open)
  if (close < 0) {
    return { answer: '', thinking: content.slice(open + '<think>'.length) }
  }

  return {
    answer: `${content.slice(0, open)}${content.slice(close + '</think>'.length)}`,
    thinking: content.slice(open + '<think>'.length, close),
  }
}

function renderAssistantContent(message: ChatMessage, loading: boolean) {
  const { answer, thinking } = splitThink(getMessageContent(message))

  return (
    <Space className={styles.assistantContent} orientation="vertical" size={10}>
      {thinking && (
        <Think
          className={styles.think}
          defaultExpanded={false}
          loading={loading}
          title="思考"
        >
          <div className={styles.messageText}>{thinking}</div>
        </Think>
      )}
      {answer && (
        <div className={styles.markdown}>
          <XMarkdown content={answer} openLinksInNewTab />
        </div>
      )}
    </Space>
  )
}

export function ChatPage() {
  const { message } = AntApp.useApp()
  const [agents, setAgents] = useState<AgentView[]>([])
  const [models, setModels] = useState<ModelView[]>([])
  const [input, setInput] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [loadingOptions, setLoadingOptions] = useState(false)

  const provider = useMemo(() => {
    if (!selectedAgent || !selectedModel) return undefined
    return createChatProvider({
      agent: selectedAgent,
      model: selectedModel,
    })
  }, [selectedAgent, selectedModel])

  const {
    abort,
    isRequesting,
    messages,
    onRequest,
  } = useXChat<ChatMessage, ChatMessage, ChatRequestParams>({
    provider,
    requestFallback: (_, { error, messageInfo }) => ({
      role: 'assistant',
      content:
        error.name === 'AbortError'
          ? getMessageContent(messageInfo?.message) || '已取消'
          : '请求失败',
    }),
    requestPlaceholder: REQUEST_PLACEHOLDER,
  })

  const role = useMemo<BubbleListProps['role']>(
    () => ({
      assistant: {
        contentRender: (content: ChatMessage, info) =>
          renderAssistantContent(
            content,
            info.status === 'loading' || info.status === 'updating',
          ),
        placement: 'start',
      },
      user: {
        contentRender: (content: ChatMessage) => (
          <div className={styles.messageText}>{getMessageContent(content)}</div>
        ),
        placement: 'end',
      },
    }),
    [],
  )

  const agentOptions = useMemo(
    () =>
      agents.map((agent) => ({
        label: agent.id,
        key: agent.id,
      })),
    [agents],
  )

  const modelOptions = useMemo(
    () =>
      models.map((model) => ({
        label: model.id,
        key: model.id,
      })),
    [models],
  )

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true)
    const [agentsResponse, modelsResponse] = await Promise.all([
      listAgents(),
      listModels(),
    ])
    setLoadingOptions(false)

    if (agentsResponse.code !== 0) {
      message.error(agentsResponse.message)
      setAgents([])
    } else {
      const enabledAgents = (agentsResponse.data ?? []).filter((agent) => agent.enabled)
      setAgents(enabledAgents)
      setSelectedAgent((current) =>
        enabledAgents.some((agent) => agent.id === current)
          ? current
          : enabledAgents[0]?.id ?? '',
      )
    }

    if (modelsResponse.code !== 0) {
      message.error(modelsResponse.message)
      setModels([])
    } else {
      const enabledModels = (modelsResponse.data ?? []).filter((model) => model.enabled)
      setModels(enabledModels)
      setSelectedModel((current) =>
        enabledModels.some((model) => model.id === current)
          ? current
          : enabledModels[0]?.id ?? '',
      )
    }
  }, [message])

  useEffect(() => {
    void loadOptions()
  }, [loadOptions])

  const bubbleItems = useMemo(
    () =>
      messages.map(({ id, message: chatMessage, status }: MessageInfo<ChatMessage>) => {
        const isUser = chatMessage.role === 'user'

        return {
          key: id,
          role: isUser ? 'user' : 'assistant',
          content: chatMessage,
          loading: status === 'loading' && !getMessageContent(chatMessage),
          status,
          styles: {
            content: isUser
              ? {
                  background: 'var(--chat-user-bubble-bg)',
                  color: 'var(--chat-user-bubble-color)',
                }
              : { background: 'var(--chat-agent-bubble-bg)' },
          },
        }
      }),
    [messages],
  )

  const submit = (value: string) => {
    const content = value.trim()
    if (!content || isRequesting) return
    if (!selectedAgent || !selectedModel) {
      message.warning('请选择 Agent 和 Model')
      return
    }
    setInput('')
    onRequest({
      agent: selectedAgent,
      messages: [{ role: 'user', content }],
      model: selectedModel,
      stream: true,
    })
  }

  const disabled = loadingOptions || !selectedAgent || !selectedModel

  return (
    <section className={styles.page}>
      <div className={styles.chatFrame}>
        <div className={styles.messages}>
          {loadingOptions && messages.length === 0 ? (
            <div className={styles.centerState}>
              <Spin />
            </div>
          ) : messages.length > 0 ? (
            <Bubble.List
              autoScroll
              className={styles.bubbleList}
              items={bubbleItems}
              role={role}
            />
          ) : null}
        </div>

        <div className={styles.composerWrap}>
          <Sender
            autoSize={{ minRows: 2, maxRows: 6 }}
            className={styles.composer}
            disabled={disabled}
            footer={(actionNode) => (
              <Flex align="center" gap={12} justify="space-between" wrap>
                <Flex align="center" gap={8} wrap>
                  <Dropdown
                    disabled={isRequesting || loadingOptions}
                    menu={{
                      items: agentOptions,
                      selectedKeys: selectedAgent ? [selectedAgent] : [],
                      onClick: ({ key }) => setSelectedAgent(key),
                    } satisfies MenuProps}
                  >
                    <DropdownSwitch icon={<Bot size={14} />}>
                      {selectedAgent || 'Agent'}
                    </DropdownSwitch>
                  </Dropdown>
                  <Dropdown
                    disabled={isRequesting || loadingOptions}
                    menu={{
                      items: modelOptions,
                      selectedKeys: selectedModel ? [selectedModel] : [],
                      onClick: ({ key }) => setSelectedModel(key),
                    } satisfies MenuProps}
                  >
                    <DropdownSwitch icon={<BrainCircuit size={14} />}>
                      {selectedModel || 'Model'}
                    </DropdownSwitch>
                  </Dropdown>
                </Flex>
                {actionNode}
              </Flex>
            )}
            loading={isRequesting}
            placeholder="想完成什么任务"
            suffix={false}
            value={input}
            onCancel={abort}
            onChange={setInput}
            onSubmit={submit}
          />
        </div>
      </div>
    </section>
  )
}
