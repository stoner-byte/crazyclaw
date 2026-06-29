import {
  ApiOutlined,
  CaretRightOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
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
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createModel,
  deleteModel,
  listModels,
  testModel,
  updateModel,
} from './service';
import type { ModelInput, ModelPayload, ModelProvider, ModelView } from './service';

type FormValues = ModelPayload;

const providerOptions: { label: string; value: ModelProvider }[] = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'DeepSeek', value: 'deepseek' },
  { label: 'DashScope', value: 'dashscope' },
  { label: 'Kimi (China)', value: 'kimi-cn' },
  { label: 'Kimi Coding Plan', value: 'kimi-codingplan' },
  { label: 'Anthropic', value: 'anthropic' },
  { label: 'Ollama', value: 'ollama' },
];

const defaultBaseUrls: Record<ModelProvider, string> = {
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  dashscope: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  'kimi-cn': 'https://api.moonshot.cn/v1',
  'kimi-codingplan': 'https://api.kimi.com/coding/v1',
  anthropic: 'https://api.anthropic.com/v1',
  ollama: 'http://localhost:11434',
};

const inputOptions: { label: string; value: ModelInput }[] = [
  { label: 'Text', value: 'text' },
  { label: 'Image', value: 'image' },
  { label: 'Video', value: 'video' },
];

const emptyValues: FormValues = {
  id: '',
  provider: 'openai',
  modelId: '',
  enabled: true,
  baseUrl: defaultBaseUrls.openai,
  apiKey: '',
  input: ['text'],
};

const normalizeInput = (value?: ModelInput[]): ModelInput[] =>
  Array.from(new Set(value ?? []));

const modalBodyStyle: CSSProperties = {
  maxHeight: '70vh',
  overflowY: 'auto',
  paddingRight: 4,
};
const modalSectionStyle: CSSProperties = {
  background: '#fafafa',
  border: '1px solid #f0f0f0',
  borderRadius: 8,
  padding: 16,
};

const Models = () => {
  const [models, setModels] = useState<ModelView[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState('');
  const activeTestIdRef = useRef('');
  const [error, setError] = useState('');
  const [editingModel, setEditingModel] = useState<ModelView | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();

  const modalTitle = editingModel ? `编辑 ${editingModel.id}` : '新增 Model';

  const loadModels = async () => {
    setLoading(true);
    setError('');
    const response = await listModels();
    setLoading(false);
    if (response.code !== 0) {
      setModels([]);
      setError(response.message);
      messageApi.error(response.message);
      return;
    }
    setModels(response.data ?? []);
  };

  useEffect(() => {
    void loadModels();
  }, []);

  const openCreate = () => {
    setEditingModel(null);
    form.setFieldsValue(emptyValues);
    setModalOpen(true);
  };

  const openEdit = (model: ModelView) => {
    setEditingModel(model);
    form.setFieldsValue({
      id: model.id,
      provider: model.provider,
      modelId: model.modelId,
      enabled: model.enabled,
      baseUrl: model.baseUrl,
      apiKey: '',
      input: normalizeInput(model.input),
    });
    setModalOpen(true);
  };

  const saveModel = async () => {
    const values = await form.validateFields();
    setSaving(true);
    const payload: ModelPayload = {
      ...values,
      apiKey: values.apiKey ?? '',
      input: normalizeInput(values.input),
    };
    const response = editingModel
      ? await updateModel(editingModel.id, payload)
      : await createModel(payload);
    setSaving(false);
    if (response.code !== 0) {
      messageApi.error(response.message);
      return;
    }
    messageApi.success(response.message);
    setModalOpen(false);
    await loadModels();
  };

  const removeModel = async (id: string) => {
    const response = await deleteModel(id);
    if (response.code !== 0) {
      messageApi.error(response.message);
      return;
    }
    messageApi.success(response.message);
    await loadModels();
  };

  const toggleModel = async (model: ModelView) => {
    setActionLoadingId(`${model.id}:toggle`);
    const response = await updateModel(model.id, {
      ...model,
      enabled: !model.enabled,
      apiKey: '',
    });
    setActionLoadingId('');
    if (response.code !== 0) {
      messageApi.error(response.message);
      return;
    }
    messageApi.success(response.message);
    await loadModels();
  };

  const runTest = async (model: ModelView, mode: 'text' | 'image') => {
    if (activeTestIdRef.current) return;
    const testId = `${model.id}:${mode}`;
    activeTestIdRef.current = testId;
    setActionLoadingId(testId);
    const response = await testModel(model.id, { mode }).finally(() => {
      activeTestIdRef.current = '';
      setActionLoadingId('');
    });
    if (response.code !== 0) {
      messageApi.error(response.message);
      return;
    }
    messageApi.success(response.message);
  };

  const content = useMemo(() => {
    if (!loading && models.length === 0) {
      return <Empty description="暂无 Models" />;
    }

    const isTestLoading =
      actionLoadingId.endsWith(':text') || actionLoadingId.endsWith(':image');

    return (
      <Row gutter={[16, 16]}>
        {models.map((model) => (
          <Col key={model.id} xs={24} md={12} xl={8} style={{ display: 'flex' }}>
            <Card
              style={{ width: '100%' }}
              title={
                <Space>
                  <span>{model.id}</span>
                  <Tag color={model.enabled ? 'green' : 'default'}>
                    {model.enabled ? '启用' : '停用'}
                  </Tag>
                </Space>
              }
              extra={
                <Space>
                  <Tooltip title={model.enabled ? '禁用 Model' : '启用 Model'}>
                    <Button
                      aria-label={model.enabled ? '禁用 Model' : '启用 Model'}
                      icon={model.enabled ? <PoweroffOutlined /> : <CaretRightOutlined />}
                      loading={actionLoadingId === `${model.id}:toggle`}
                      size="small"
                      onClick={() => void toggleModel(model)}
                    />
                  </Tooltip>
                  <Tooltip title="测试文本">
                    <Button
                      aria-label="测试文本"
                      disabled={!model.input.includes('text') || isTestLoading}
                      icon={<CheckCircleOutlined />}
                      loading={actionLoadingId === `${model.id}:text`}
                      size="small"
                      onClick={() => void runTest(model, 'text')}
                    />
                  </Tooltip>
                  <Tooltip
                    title={
                      model.input.includes('image')
                        ? '测试多模态'
                        : '当前模型未配置多模态输入'
                    }
                  >
                    <Button
                      aria-label="测试多模态"
                      disabled={!model.input.includes('image') || isTestLoading}
                      icon={<EyeOutlined />}
                      loading={actionLoadingId === `${model.id}:image`}
                      size="small"
                      onClick={() => void runTest(model, 'image')}
                    />
                  </Tooltip>
                  <Tooltip title="编辑 Model">
                    <Button
                      aria-label="编辑 Model"
                      icon={<EditOutlined />}
                      size="small"
                      onClick={() => openEdit(model)}
                    />
                  </Tooltip>
                  <Popconfirm
                    title="删除 Model"
                    description="只删除配置，不影响外部模型服务。"
                    okText="确认"
                    cancelText="取消"
                    onConfirm={() => void removeModel(model.id)}
                  >
                    <Tooltip title="删除 Model">
                      <Button
                        aria-label="删除 Model"
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
                <div>
                  <Space>
                    <Typography.Text type="secondary">Provider</Typography.Text>
                    <Tag color="blue">{model.provider}</Tag>
                  </Space>
                </div>
                <div>
                  <Typography.Text type="secondary">模型 ID</Typography.Text>
                  <Typography.Paragraph copyable style={{ marginBottom: 0 }}>
                    {model.modelId}
                  </Typography.Paragraph>
                </div>
                <div>
                  <Typography.Text type="secondary">Base URL</Typography.Text>
                  <Typography.Paragraph
                    copyable
                    ellipsis={{ rows: 1 }}
                    title={model.baseUrl}
                    style={{ marginBottom: 0 }}
                  >
                    {model.baseUrl}
                  </Typography.Paragraph>
                </div>
                <Space wrap>
                  <Typography.Text type="secondary">密钥</Typography.Text>
                  <Tag color={model.hasApiKey ? 'green' : 'default'}>
                    {model.hasApiKey ? '已配置密钥' : '未配置密钥'}
                  </Tag>
                  {model.maskedApiKey && <Tag>{model.maskedApiKey}</Tag>}
                </Space>
                <div>
                  <Typography.Text type="secondary">输入</Typography.Text>
                  <div
                    style={{
                      alignItems: 'center',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      minHeight: 32,
                    }}
                  >
                    {model.input.length === 0 ? (
                      <Typography.Text disabled italic style={{ fontSize: 13 }}>
                        未配置输入
                      </Typography.Text>
                    ) : (
                      model.input.map((input) => (
                        <Tag key={input}>{input}</Tag>
                      ))
                    )}
                  </div>
                </div>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    );
  }, [actionLoadingId, loading, models]);

  return (
    <PageContainer
      extra={[
        <Button key="refresh" icon={<ReloadOutlined />} onClick={loadModels}>
          刷新
        </Button>,
        <Button key="new" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增 Model
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
        onOk={() => void saveModel()}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={emptyValues} requiredMark={false}>
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <div style={modalSectionStyle}>
              <Space style={{ marginBottom: 12 }}>
                <ApiOutlined />
                <Typography.Text strong>基础信息</Typography.Text>
              </Space>
              <Row gutter={16}>
                <Col xs={24} md={16}>
                  <Form.Item
                    label="模型名称"
                    name="id"
                    rules={[
                      { required: true, message: '请输入模型名称' },
                      {
                        pattern: /^[A-Za-z0-9_-]+$/,
                        message: '只允许字母、数字、_、-',
                      },
                    ]}
                  >
                    <Input disabled={Boolean(editingModel)} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="启用" name="enabled" valuePropName="checked">
                    <Switch checkedChildren="启用" unCheckedChildren="停用" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Provider"
                    name="provider"
                    rules={[{ required: true, message: '请选择 Provider' }]}
                  >
                    <Select
                      options={providerOptions}
                      onChange={(provider: ModelProvider) => {
                        form.setFieldValue('baseUrl', defaultBaseUrls[provider]);
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={16}>
                  <Form.Item
                    label="模型 ID"
                    name="modelId"
                    rules={[{ required: true, message: '请输入模型 ID' }]}
                  >
                    <Input placeholder="例如 gpt-4o-mini" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                label="Base URL"
                name="baseUrl"
                rules={[
                  { required: true, message: '请输入 Base URL' },
                  { type: 'url', message: '请输入合法 URL' },
                ]}
              >
                <Input placeholder="https://api.openai.com/v1" />
              </Form.Item>
              <Form.Item
                label="API Key"
                name="apiKey"
                extra={editingModel ? '留空会保留当前密钥' : undefined}
              >
                <Input.Password placeholder="输入 API Key" />
              </Form.Item>
              <Form.Item
                label="输入"
                name="input"
                normalize={normalizeInput}
                style={{ marginBottom: 0 }}
              >
                <Select mode="multiple" options={inputOptions} placeholder="选择输入类型" />
              </Form.Item>
            </div>
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default Models;
