import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Empty,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { Play, Power, RefreshCcw, Wrench } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { listTools, type ToolView, updateTool } from '../../services/tools'
import styles from './styles.module.css'

export function ToolsPage() {
  const { message } = AntApp.useApp()
  const [tools, setTools] = useState<ToolView[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState('')
  const [error, setError] = useState('')

  const loadTools = useCallback(async () => {
    setLoading(true)
    setError('')
    const response = await listTools()
    setLoading(false)

    if (response.code !== 0) {
      setTools([])
      setError(response.message)
      message.error(response.message)
      return
    }

    setTools(response.data ?? [])
  }, [message])

  useEffect(() => {
    void loadTools()
  }, [loadTools])

  const toggleTool = async (tool: ToolView) => {
    setActionLoadingId(tool.name)
    const response = await updateTool(tool.name, {
      ...tool,
      enabled: !tool.enabled,
    })
    setActionLoadingId('')

    if (response.code !== 0) {
      message.error(response.message)
      return
    }

    message.success(response.message)
    await loadTools()
  }

  return (
    <section className="cc-page">
      <header className={styles.header}>
        <Typography.Title className={styles.title} level={2}>
          Tools
        </Typography.Title>
        <Button icon={<RefreshCcw size={16} />} onClick={() => void loadTools()}>
          刷新
        </Button>
      </header>

      {error && <Alert message={error} type="error" showIcon />}

      {tools.length === 0 && loading ? (
        <div className={styles.emptyState}>
          <Spin />
        </div>
      ) : tools.length === 0 ? (
        <div className={styles.emptyState}>
          <Empty description="暂无 Tools" />
        </div>
      ) : (
        <div className={styles.toolGrid}>
          {tools.map((tool) => (
            <Card
              className={styles.toolCard}
              key={tool.name}
              loading={loading}
              title={
                <Space size={10}>
                  <span className={styles.toolIcon}>
                    <Wrench size={18} />
                  </span>
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
                    icon={tool.enabled ? <Power size={15} /> : <Play size={15} />}
                    loading={actionLoadingId === tool.name}
                    size="small"
                    onClick={() => void toggleTool(tool)}
                  />
                </Tooltip>
              }
            >
              <Space orientation="vertical" size={12} className={styles.cardBody}>
                <Typography.Paragraph className={styles.description}>
                  {tool.description || '无描述'}
                </Typography.Paragraph>
                <Tag color={tool.builtIn ? 'blue' : 'default'}>
                  {tool.builtIn ? '内置' : '自定义'}
                </Tag>
              </Space>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
