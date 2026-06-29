import {
  CaretRightOutlined,
  PoweroffOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Card,
  Empty,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { listTools, updateTool } from './service';
import type { ToolView } from './service';
import { useStyles } from './style';

const Tools = () => {
  const { styles } = useStyles();
  const [tools, setTools] = useState<ToolView[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [error, setError] = useState('');
  const [messageApi, contextHolder] = message.useMessage();
  const enabledToolCount = tools.filter((tool) => tool.enabled).length;
  const builtInToolCount = tools.filter((tool) => tool.builtIn).length;

  const loadTools = async () => {
    setLoading(true);
    setError('');
    const response = await listTools();
    setLoading(false);
    if (response.code !== 0) {
      setTools([]);
      setError(response.message);
      messageApi.error(response.message);
      return;
    }
    setTools(response.data ?? []);
  };

  useEffect(() => {
    void loadTools();
  }, []);

  const toggleTool = async (tool: ToolView) => {
    setActionLoadingId(tool.name);
    const response = await updateTool(tool.name, {
      ...tool,
      enabled: !tool.enabled,
    });
    setActionLoadingId('');
    if (response.code !== 0) {
      messageApi.error(response.message);
      return;
    }
    messageApi.success(response.message);
    await loadTools();
  };

  const content = useMemo(() => {
    if (!loading && tools.length === 0) {
      return <Empty description="暂无 Tools" />;
    }

    return (
      <div className={styles.toolGrid}>
        {tools.map((tool) => (
          <Card
            className={styles.toolCard}
            key={tool.name}
            title={
              <Space>
                <span>{tool.name}</span>
                <Tag color={tool.enabled ? 'green' : 'default'}>
                  {tool.enabled ? '启用' : '停用'}
                </Tag>
              </Space>
            }
            extra={
              <Tooltip title={tool.enabled ? '禁用 Tool' : '启用 Tool'}>
                <Button
                  aria-label={tool.enabled ? '禁用 Tool' : '启用 Tool'}
                  icon={tool.enabled ? <PoweroffOutlined /> : <CaretRightOutlined />}
                  loading={actionLoadingId === tool.name}
                  size="small"
                  onClick={() => void toggleTool(tool)}
                />
              </Tooltip>
            }
          >
            <Space orientation="vertical" size={12} style={{ width: '100%' }}>
              <Typography.Paragraph type="secondary">
                {tool.description || '无描述'}
              </Typography.Paragraph>
              <Space>
                <Tag color={tool.builtIn ? 'blue' : 'default'}>
                  {tool.builtIn ? '内置' : '自定义'}
                </Tag>
              </Space>
            </Space>
          </Card>
        ))}
      </div>
    );
  }, [actionLoadingId, loading, styles.toolCard, styles.toolGrid, tools]);

  return (
    <PageContainer
      extra={[
        <Button key="refresh" icon={<ReloadOutlined />} onClick={loadTools}>
          刷新
        </Button>,
      ]}
    >
      {contextHolder}
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      <div className={styles.summaryGrid}>
        <Card aria-label="启用工具统计" className={styles.summaryCard}>
          <Typography.Text className={styles.summaryLabel} type="secondary">
            启用工具
          </Typography.Text>
          <div className={styles.summaryValue}>{enabledToolCount}</div>
        </Card>
        <Card aria-label="内置工具统计" className={styles.summaryCard}>
          <Typography.Text className={styles.summaryLabel} type="secondary">
            内置工具
          </Typography.Text>
          <div className={styles.summaryValue}>{builtInToolCount}</div>
        </Card>
      </div>
      {content}
    </PageContainer>
  );
};

export default Tools;
