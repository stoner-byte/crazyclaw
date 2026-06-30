import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import {
  Bot,
  Folder,
  Pencil,
  Play,
  Plus,
  Power,
  RefreshCcw,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  type AgentPayload,
  type AgentView,
  createAgent,
  deleteAgent,
  listAgents,
  updateAgent,
} from '../../services/agents'
import { listTools, type ToolView } from '../../services/tools'
import styles from './styles.module.css'

type FormValues = Omit<AgentPayload, 'workspaces'> & {
  extraWorkspaces?: string[]
}

const emptyValues: FormValues = {
  id: '',
  description: '',
  enabled: true,
  tools: [],
  systemPrompt: '',
  extraWorkspaces: [],
}

const visibleToolCount = 3

function normalizeStringList(value?: string[]) {
  return Array.from(
    new Set((value ?? []).map((item) => item.trim()).filter(Boolean)),
  )
}

function buildAgentPayload(values: FormValues, editingAgent: AgentView | null) {
  const payload: AgentPayload = {
    id: values.id,
    description: values.description ?? '',
    enabled: values.enabled,
    tools: normalizeStringList(values.tools),
    systemPrompt: values.systemPrompt ?? '',
  }

  if (!editingAgent) return payload

  return {
    ...payload,
    workspaces: [
      editingAgent.workspaces[0],
      ...normalizeStringList(values.extraWorkspaces),
    ],
  }
}

export function AgentsPage() {
  const { message } = AntApp.useApp()
  const [agents, setAgents] = useState<AgentView[]>([])
  const [tools, setTools] = useState<ToolView[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState('')
  const [error, setError] = useState('')
  const [editingAgent, setEditingAgent] = useState<AgentView | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm<FormValues>()

  const defaultWorkspace = editingAgent?.workspaces[0] ?? ''
  const modalTitle = editingAgent ? `编辑 ${editingAgent.id}` : '新增 Agent'
  const toolOptions = useMemo(
    () =>
      tools
        .filter((tool) => tool.enabled)
        .map((tool) => ({ label: tool.name, value: tool.name })),
    [tools],
  )

  const loadAgents = useCallback(async () => {
    setLoading(true)
    setError('')
    const response = await listAgents()
    setLoading(false)

    if (response.code !== 0) {
      setAgents([])
      setError(response.message)
      message.error(response.message)
      return
    }

    setAgents(response.data ?? [])
  }, [message])

  const loadTools = useCallback(async () => {
    const response = await listTools()
    if (response.code === 0) {
      setTools(response.data ?? [])
    }
  }, [])

  useEffect(() => {
    void loadAgents()
    void loadTools()
  }, [loadAgents, loadTools])

  const openCreate = () => {
    setEditingAgent(null)
    form.setFieldsValue(emptyValues)
    setModalOpen(true)
  }

  const openEdit = (agent: AgentView) => {
    setEditingAgent(agent)
    form.setFieldsValue({
      id: agent.id,
      description: agent.description,
      enabled: agent.enabled,
      tools: normalizeStringList(agent.tools),
      systemPrompt: agent.systemPrompt,
      extraWorkspaces: agent.workspaces.slice(1),
    })
    setModalOpen(true)
  }

  const saveAgent = async () => {
    const values = await form.validateFields()
    setSaving(true)
    const payload = buildAgentPayload(values, editingAgent)
    const response = editingAgent
      ? await updateAgent(editingAgent.id, payload)
      : await createAgent(payload)
    setSaving(false)

    if (response.code !== 0) {
      message.error(response.message)
      return
    }

    message.success(response.message)
    setModalOpen(false)
    await loadAgents()
  }

  const removeAgent = async (id: string) => {
    const response = await deleteAgent(id)
    if (response.code !== 0) {
      message.error(response.message)
      return
    }

    message.success(response.message)
    await loadAgents()
  }

  const toggleAgent = async (agent: AgentView) => {
    setActionLoadingId(agent.id)
    const response = await updateAgent(agent.id, {
      ...agent,
      enabled: !agent.enabled,
    })
    setActionLoadingId('')

    if (response.code !== 0) {
      message.error(response.message)
      return
    }

    message.success(response.message)
    await loadAgents()
  }

  return (
    <section className="cc-page">
      <header className={styles.header}>
        <div>
          <Typography.Title className={styles.title} level={2}>
            Agents
          </Typography.Title>
        </div>
        <Space>
          <Button icon={<RefreshCcw size={16} />} onClick={() => void loadAgents()}>
            刷新
          </Button>
          <Button icon={<Plus size={16} />} type="primary" onClick={openCreate}>
            新增 Agent
          </Button>
        </Space>
      </header>

      {error && <Alert message={error} type="error" showIcon />}

      {agents.length === 0 && loading ? (
        <div className={styles.emptyState}>
          <Spin />
        </div>
      ) : agents.length === 0 ? (
        <div className={styles.emptyState}>
          <Empty description="暂无 Agents" />
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {agents.map((agent) => (
            <Col key={agent.id} xs={24} md={12} xl={8}>
              <Card
                className={styles.agentCard}
                loading={loading}
                variant="outlined"
                title={
                  <Space size={10}>
                    <span className={styles.agentIcon}>
                      <Bot size={18} />
                    </span>
                    <span>{agent.id}</span>
                    <Tag color={agent.enabled ? 'green' : 'default'}>
                      {agent.enabled ? '启用' : '停用'}
                    </Tag>
                  </Space>
                }
                extra={
                  <Space size={6}>
                    <Tooltip title={agent.enabled ? '禁用 Agent' : '启用 Agent'}>
                      <Button
                        aria-label={agent.enabled ? '禁用 Agent' : '启用 Agent'}
                        icon={
                          agent.enabled ? <Power size={15} /> : <Play size={15} />
                        }
                        loading={actionLoadingId === agent.id}
                        size="small"
                        onClick={() => void toggleAgent(agent)}
                      />
                    </Tooltip>
                    <Tooltip title="编辑 Agent">
                      <Button
                        aria-label="编辑 Agent"
                        icon={<Pencil size={15} />}
                        size="small"
                        onClick={() => openEdit(agent)}
                      />
                    </Tooltip>
                    <Popconfirm
                      title="删除 Agent"
                      description="只删除配置，不删除工作目录文件。"
                      okText="确认"
                      cancelText="取消"
                      onConfirm={() => void removeAgent(agent.id)}
                    >
                      <Tooltip title="删除 Agent">
                        <Button
                          aria-label="删除 Agent"
                          danger
                          icon={<Trash2 size={15} />}
                          size="small"
                        />
                      </Tooltip>
                    </Popconfirm>
                  </Space>
                }
              >
                <Space orientation="vertical" size={14} className={styles.cardBody}>
                  <Typography.Paragraph className={styles.description}>
                    {agent.description || '无描述'}
                  </Typography.Paragraph>

                  <div className={styles.sectionBlock}>
                    <Space>
                      <Typography.Text type="secondary">工作目录</Typography.Text>
                      <Tag>共 {agent.workspaces.length} 个</Tag>
                    </Space>
                    <Space align="start" className={styles.workspaceLine}>
                      <Tag color="blue">默认</Tag>
                      <Typography.Paragraph
                        copyable
                        ellipsis={{ rows: 1 }}
                        className={styles.workspaceText}
                      >
                        {agent.workspaces[0]}
                      </Typography.Paragraph>
                    </Space>
                    {agent.workspaces.length > 1 && (
                      <Tooltip
                        title={
                          <div className={styles.workspaceTooltip}>
                            {agent.workspaces.slice(1).map((workspace) => (
                              <div key={workspace}>{workspace}</div>
                            ))}
                          </div>
                        }
                      >
                        <Typography.Text
                          className={styles.moreWorkspaces}
                          type="secondary"
                        >
                          +{agent.workspaces.length - 1} 个其他目录
                        </Typography.Text>
                      </Tooltip>
                    )}
                  </div>

                  <div className={styles.sectionBlock}>
                    <Typography.Text type="secondary">工具列表</Typography.Text>
                    <div className={styles.toolList}>
                      {agent.tools.length === 0 ? (
                        <Typography.Text type="secondary">未配置工具</Typography.Text>
                      ) : (
                        <>
                          {agent.tools.slice(0, visibleToolCount).map((tool, index) => (
                            <Tag
                              className={styles.toolTag}
                              key={`${tool}-${index}`}
                            >
                              {tool}
                            </Tag>
                          ))}
                          {agent.tools.length > visibleToolCount && (
                            <Tooltip title={agent.tools.slice(visibleToolCount).join(', ')}>
                              <Tag>+{agent.tools.length - visibleToolCount}</Tag>
                            </Tooltip>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title={modalTitle}
        open={modalOpen}
        okText="保存"
        cancelText="取消"
        centered
        confirmLoading={saving}
        destroyOnHidden
        forceRender
        width={760}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
        onOk={() => void saveAgent()}
        onCancel={() => setModalOpen(false)}
      >
        <Form form={form} layout="vertical" initialValues={emptyValues} requiredMark={false}>
          <Space orientation="vertical" size={16} className={styles.modalStack}>
            <div className={styles.modalSection}>
              <Typography.Text strong>基础信息</Typography.Text>
              <Row gutter={16} className={styles.formRow}>
                <Col xs={24} md={16}>
                  <Form.Item
                    label="Agent ID"
                    name="id"
                    rules={[
                      { required: true, message: '请输入 Agent ID' },
                      {
                        pattern: /^[A-Za-z0-9_-]+$/,
                        message: '只允许字母、数字、_、-',
                      },
                    ]}
                  >
                    <Input disabled={Boolean(editingAgent)} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="启用" name="enabled" valuePropName="checked">
                    <Switch checkedChildren="启用" unCheckedChildren="停用" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="描述" name="description">
                <Input.TextArea rows={3} />
              </Form.Item>
              <Form.Item
                label="工具"
                name="tools"
                normalize={normalizeStringList}
                className={styles.lastFormItem}
              >
                <Select
                  mode="tags"
                  options={toolOptions}
                  placeholder="输入工具名称后回车"
                />
              </Form.Item>
            </div>

            {editingAgent && (
              <div className={styles.modalSection}>
                <Space>
                  <Folder size={16} />
                  <Typography.Text strong>工作目录</Typography.Text>
                </Space>
                <Form.Item label="默认工作目录">
                  <Input aria-label="默认工作目录" value={defaultWorkspace} disabled />
                </Form.Item>
                <Form.List name="extraWorkspaces">
                  {(fields, { add, remove }) => (
                    <Space orientation="vertical" className={styles.modalStack}>
                      {fields.length > 0 && (
                        <Typography.Text>其他工作目录</Typography.Text>
                      )}
                      {fields.map(({ key, ...field }) => (
                        <div className={styles.workspaceEditLine} key={key}>
                          <Form.Item
                            {...field}
                            rules={[{ required: true, message: '请输入工作目录' }]}
                            className={styles.workspaceEditInput}
                          >
                            <Input placeholder="例如 /Users/me/project" />
                          </Form.Item>
                          <Button
                            aria-label="删除工作目录"
                            icon={<Trash2 size={15} />}
                            onClick={() => remove(field.name)}
                          />
                        </div>
                      ))}
                      <Button icon={<Plus size={16} />} onClick={() => add()}>
                        添加工作目录
                      </Button>
                    </Space>
                  )}
                </Form.List>
              </div>
            )}

            <div className={styles.modalSection}>
              <Form.Item label="CRAZY.md" name="systemPrompt" className={styles.lastFormItem}>
                <Input.TextArea rows={10} placeholder="输入 Agent 的 system prompt" />
              </Form.Item>
            </div>
          </Space>
        </Form>
      </Modal>
    </section>
  )
}
