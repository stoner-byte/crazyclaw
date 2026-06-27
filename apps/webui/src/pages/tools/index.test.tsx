import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Tools from './index';
import * as service from './service';
import type { ToolView } from './service';

vi.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ children, extra }: any) => (
    <main>
      <div>{extra}</div>
      {children}
    </main>
  ),
}));

vi.mock('./service', () => ({
  listTools: vi.fn(),
  updateTool: vi.fn(),
}));

const shell: ToolView = {
  name: 'shell',
  description: 'Run shell commands',
  builtIn: true,
  enabled: true,
};
const filesystem: ToolView = {
  name: 'filesystem',
  description: 'Read and write workspace files',
  builtIn: false,
  enabled: false,
};

describe('Tools page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(service.listTools).mockResolvedValue({
      code: 0,
      data: [shell, filesystem],
      message: 'Tools loaded',
    });
    vi.mocked(service.updateTool).mockResolvedValue({
      code: 0,
      data: { ...shell, enabled: false },
      message: 'Tool updated',
    });
  });

  it('loads tools and renders cards', async () => {
    render(<Tools />);

    expect(await screen.findByText('shell')).toBeInTheDocument();
    expect(screen.getByText('Run shell commands')).toBeInTheDocument();
    expect(screen.getByText('内置')).toBeInTheDocument();
    expect(screen.getByText('启用')).toBeInTheDocument();
  });

  it('shows enabled and built-in tool counts', async () => {
    render(<Tools />);

    const enabledStat = await screen.findByLabelText('启用工具统计');
    const builtInStat = await screen.findByLabelText('内置工具统计');
    expect(within(enabledStat).getByText('启用工具')).toBeInTheDocument();
    expect(within(enabledStat).getByText('1')).toBeInTheDocument();
    expect(within(builtInStat).getByText('内置工具')).toBeInTheDocument();
    expect(within(builtInStat).getByText('1')).toBeInTheDocument();
  });

  it('toggles enabled state from the card', async () => {
    render(<Tools />);
    fireEvent.click(await screen.findByRole('button', { name: '禁用 Tool' }));

    await waitFor(() => {
      expect(service.updateTool).toHaveBeenCalledWith('shell', {
        ...shell,
        enabled: false,
      });
    });
  });

  it('does not render create, edit, or delete actions', async () => {
    render(<Tools />);

    expect(await screen.findByText('shell')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /新增/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /编辑/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /删除/ })).not.toBeInTheDocument();
  });

  it('shows API error message', async () => {
    vi.mocked(service.listTools).mockResolvedValue({
      code: 1205,
      data: [],
      message: '配置文件读写失败',
    });

    render(<Tools />);

    expect(await screen.findByText('配置文件读写失败')).toBeInTheDocument();
  });
});
