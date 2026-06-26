import {
  DeleteOutlined,
  EditOutlined,
  CaretRightOutlined,
  FolderOutlined,
  PlusOutlined,
  PoweroffOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Alert,
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
  Switch,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  AgentPayload,
  AgentView,
  createAgent,
  deleteAgent,
  listAgents,
  updateAgent,
} from './service';

type FormValues = Omit<AgentPayload, 'workspaces'> & {
  extraWorkspaces?: string[];
};

const emptyValues: FormValues = {
  id: '',
  description: '',
  enabled: true,
  tools: [],
  systemPrompt: '',
  extraWorkspaces: [],
};

const visibleToolCount = 3;
const tooltipListStyle = {
  maxHeight: 160,
  maxWidth: 360,
  overflow: 'auto',
};
const tooltipItemStyle = { whiteSpace: 'nowrap' };
const normalizeStringList = (value?: string[]) =>
  Array.from(new Set((value ?? []).map((item) => item.trim()).filter(Boolean)));
const modalBodyStyle: CSSProperties = { maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 };
const modalSectionStyle: CSSProperties = {
  background: '#fafafa',
  border: '1px solid #f0f0f0',
  borderRadius: 8,
  padding: 16,
};
const modalSectionTitleStyle: CSSProperties = { marginBottom: 12 };

const Agents = () => {
  const [agents, setAgents] = useState<AgentView[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [error, setError] = useState('');
  const [editingAgent, setEditingAgent] = useState<AgentView | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();

  const defaultWorkspace = editingAgent?.workspaces[0] ?? '';
  const modalTitle = editingAgent ? `编辑 ${editingAgent.id}` : '新增 Agent';

  const loadAgents = async () => {
    setLoading(true);
    setError('');
    const response = await listAgents();
    setLoading(false);
    if (response.code !== 0) {
      setAgents([]);
      setError(response.message);
      messageApi.error(response.message);
      return;
    }
    setAgents(response.data ?? []);
  };

  useEffect(() => {
    void loadAgents();
  }, []);

  const openCreate = () => {
    setEditingAgent(null);
    form.setFieldsValue(emptyValues);
    setModalOpen(true);
  };

  const openEdit = (agent: AgentView) => {
    setEditingAgent(agent);
    form.setFieldsValue({
      id: agent.id,
      description: agent.description,
      enabled: agent.enabled,
      tools: normalizeStringList(agent.tools),
      systemPrompt: agent.systemPrompt,
      extraWorkspaces: agent.workspaces.slice(1),
    });
    setModalOpen(true);
  };

  const saveAgent = async () => {
    const values = await form.validateFields();
    setSaving(true);
    const payload: AgentPayload = {
      id: values.id,
      description: values.description ?? '',
      enabled: values.enabled,
      tools: normalizeStringList(values.tools),
      systemPrompt: values.systemPrompt ?? '',
      ...(editingAgent
        ? {
            workspaces: [
              editingAgent.workspaces[0],
              ...(values.extraWorkspaces ?? []).filter(Boolean),
            ],
          }
        : {}),
    };
    const response = editingAgent
      ? await updateAgent(editingAgent.id, payload)
      : await createAgent(payload);
    setSaving(false);
    if (response.code !== 0) {
      messageApi.error(response.message);
      return;
    }
    messageApi.success(response.message);
    setModalOpen(false);
    await loadAgents();
  };

  const removeAgent = async (id: string) => {
    const response = await deleteAgent(id);
    if (response.code !== 0) {
      messageApi.error(response.message);
      return;
    }
    messageApi.success(response.message);
    await loadAgents();
  };

  const toggleAgent = async (agent: AgentView) => {
    setActionLoadingId(agent.id);
    const response = await updateAgent(agent.id, {
      ...agent,
      enabled: !agent.enabled,
    });
    setActionLoadingId('');
    if (response.code !== 0) {
      messageApi.error(response.message);
      return;
    }
    messageApi.success(response.message);
    await loadAgents();
  };

  const content = useMemo(() => {
    if (!loading && agents.length === 0) {
      return <Empty description="暂无 Agents" />;
    }

    return (
      <Row gutter={[16, 16]}>
        {agents.map((agent) => (
          <Col key={agent.id} xs={24} md={12} xl={8} style={{ display: 'flex' }}>
            <Card
              style={{ width: '100%' }}
              title={
                <Space>
                  <span>{agent.id}</span>
                  <Tag color={agent.enabled ? 'green' : 'default'}>
                    {agent.enabled ? '启用' : '停用'}
                  </Tag>
                </Space>
              }
              extra={
                <Space>
                  <Tooltip title={agent.enabled ? '禁用 Agent' : '启用 Agent'}>
                    <Button
                      aria-label={agent.enabled ? '禁用 Agent' : '启用 Agent'}
                      icon={agent.enabled ? <PoweroffOutlined /> : <CaretRightOutlined />}
                      loading={actionLoadingId === agent.id}
                      size="small"
                      onClick={() => void toggleAgent(agent)}
                    />
                  </Tooltip>
                  <Tooltip title="编辑 Agent">
                    <Button
                      aria-label="编辑 Agent"
                      icon={<EditOutlined />}
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
                        icon={<DeleteOutlined />}
                        size="small"
                      />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              }
            >
              <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                <Typography.Paragraph type="secondary">
                  {agent.description || '无描述'}
                </Typography.Paragraph>
                <div>
                  <Space>
                    <Typography.Text type="secondary">工作目录</Typography.Text>
                    <Tag>共 {agent.workspaces.length} 个</Tag>
                  </Space>
                  <Space align="start" style={{ marginTop: 4, width: '100%' }}>
                    <Tag color="blue">默认</Tag>
                    <Typography.Paragraph
                      copyable
                      ellipsis={{ rows: 1 }}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      {agent.workspaces[0]}
                    </Typography.Paragraph>
                  </Space>
                  {agent.workspaces.length > 1 ? (
                    <Tooltip title={agent.workspaces.slice(1).join(', ')}>
                      <Typography.Text disabled style={{ fontSize: 13 }}>
                        +{agent.workspaces.length - 1} 个其他目录
                      </Typography.Text>
                    </Tooltip>
                  ) : (
                    <div style={{ height: 22 }} />
                  )}
                </div>
                <div>
                  <Typography.Text type="secondary">工具列表</Typography.Text>
                  <div
                    style={{
                      alignItems: 'center',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      minHeight: 32,
                    }}
                  >
                    {agent.tools.length === 0 ? (
                      <Typography.Text
                        disabled
                        italic
                        style={{ fontSize: 13 }}
                      >
                        未配置工具
                      </Typography.Text>
                    ) : (
                      <>
                        {agent.tools.slice(0, visibleToolCount).map((tool, index) => (
                          <Tag
                            key={`${tool}-${index}`}
                            style={{
                              maxWidth: 120,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {tool}
                          </Tag>
                        ))}
                        {agent.tools.length > visibleToolCount && (
                          <Tooltip
                            title={
                              <div style={tooltipListStyle}>
                                {agent.tools.slice(visibleToolCount).map((tool, index) => (
                                  <div key={`${tool}-${index}`} style={tooltipItemStyle}>
                                    {tool}
                                  </div>
                                ))}
                              </div>
                            }
                          >
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
    );
  }, [actionLoadingId, agents, loading]);

  return (
    <PageContainer
      extra={[
        <Button key="refresh" icon={<ReloadOutlined />} onClick={loadAgents}>
          刷新
        </Button>,
        <Button key="new" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增 Agent
        </Button>,
      ]}
    >
      {contextHolder}
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      {content}
      <Modal
        title={modalTitle}
        open={modalOpen}
        okText="保存"
        cancelText="取消"
        centered
        confirmLoading={saving}
        forceRender
        width={760}
        styles={{ body: modalBodyStyle }}
        onOk={() => void saveAgent()}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={emptyValues} requiredMark={false}>
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <div style={modalSectionStyle}>
              <Typography.Text strong style={modalSectionTitleStyle}>
                基础信息
              </Typography.Text>
              <Row gutter={16}>
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
                style={{ marginBottom: 0 }}
              >
                <Select mode="tags" placeholder="输入工具名称后回车" />
              </Form.Item>
            </div>

            {editingAgent && (
              <div style={modalSectionStyle}>
                <Space style={modalSectionTitleStyle}>
                  <FolderOutlined />
                  <Typography.Text strong>工作目录</Typography.Text>
                </Space>
                <Form.Item label="默认工作目录">
                  <Input aria-label="默认工作目录" value={defaultWorkspace} disabled />
                </Form.Item>
                <Form.List name="extraWorkspaces">
                  {(fields, { add, remove }) => (
                    <Space orientation="vertical" style={{ width: '100%' }}>
                      {fields.length > 0 && (
                        <Typography.Text>其他工作目录</Typography.Text>
                      )}
                      {fields.map(({ key, ...field }) => (
                        <div
                          key={key}
                          style={{ alignItems: 'flex-start', display: 'flex', gap: 8, width: '100%' }}
                        >
                          <Form.Item
                            {...field}
                            rules={[{ required: true, message: '请输入工作目录' }]}
                            style={{ flex: 1, marginBottom: 0 }}
                          >
                            <Input placeholder="例如 /Users/me/project" />
                          </Form.Item>
                          <Button
                            aria-label="删除工作目录"
                            icon={<DeleteOutlined />}
                            onClick={() => remove(field.name)}
                          />
                        </div>
                      ))}
                      <Button icon={<PlusOutlined />} onClick={() => add()}>
                        添加工作目录
                      </Button>
                    </Space>
                  )}
                </Form.List>
              </div>
            )}

            <div style={modalSectionStyle}>
              <Form.Item label="CRAZY.md" name="systemPrompt" style={{ marginBottom: 0 }}>
                <Input.TextArea rows={10} placeholder="输入 Agent 的 system prompt" />
              </Form.Item>
            </div>
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default Agents;
