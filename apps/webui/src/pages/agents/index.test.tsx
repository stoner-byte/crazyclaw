import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Agents from './index';
import * as service from './service';

vi.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ children, extra }: any) => (
    <main>
      <div>{extra}</div>
      {children}
    </main>
  ),
}));

vi.mock('./service', () => ({
  createAgent: vi.fn(),
  deleteAgent: vi.fn(),
  listAgents: vi.fn(),
  updateAgent: vi.fn(),
}));

const coder = {
  id: 'coder',
  description: 'Coding assistant',
  enabled: true,
  tools: ['shell'],
  workspaces: ['/Users/me/.crazyclaw/coder'],
  systemPrompt: 'You are a coding agent.',
};

describe('Agents page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(service.listAgents).mockResolvedValue({
      code: 0,
      data: [coder],
      message: 'Agents loaded',
    });
    vi.mocked(service.createAgent).mockResolvedValue({
      code: 0,
      data: coder,
      message: 'Agent created',
    });
    vi.mocked(service.updateAgent).mockResolvedValue({
      code: 0,
      data: coder,
      message: 'Agent updated',
    });
    vi.mocked(service.deleteAgent).mockResolvedValue({
      code: 0,
      data: { id: 'coder' },
      message: 'Agent deleted',
    });
  });

  it('loads agents and renders cards', async () => {
    render(<Agents />);

    expect(await screen.findByText('coder')).toBeInTheDocument();
    expect(screen.getByText('Coding assistant')).toBeInTheDocument();
    expect(screen.getByText('shell')).toBeInTheDocument();
    expect(screen.getByText('/Users/me/.crazyclaw/coder')).toBeInTheDocument();
  });

  it('creates an agent from the form', async () => {
    vi.mocked(service.listAgents)
      .mockResolvedValueOnce({ code: 0, data: [], message: 'Agents loaded' })
      .mockResolvedValueOnce({ code: 0, data: [coder], message: 'Agents loaded' });

    render(<Agents />);
    fireEvent.click(await screen.findByRole('button', { name: /新增 Agent/ }));
    fireEvent.change(screen.getByLabelText('Agent ID'), {
      target: { value: 'coder' },
    });
    fireEvent.change(screen.getByLabelText('描述'), {
      target: { value: 'Coding assistant' },
    });
    fireEvent.change(screen.getByLabelText('CRAZY.md'), {
      target: { value: 'You are a coding agent.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(service.createAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'coder',
          description: 'Coding assistant',
          enabled: true,
          systemPrompt: 'You are a coding agent.',
        }),
      );
    });
  });

  it('edits an agent with readonly id and default workspace', async () => {
    render(<Agents />);
    fireEvent.click(await screen.findByRole('button', { name: /编辑/ }));

    expect(screen.getByLabelText('Agent ID')).toBeDisabled();
    expect(screen.getByLabelText('默认工作目录')).toBeDisabled();

    fireEvent.change(screen.getByLabelText('描述'), {
      target: { value: 'Updated' },
    });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(service.updateAgent).toHaveBeenCalledWith(
        'coder',
        expect.objectContaining({ id: 'coder', description: 'Updated' }),
      );
    });
  });

  it('deletes after confirmation', async () => {
    render(<Agents />);
    fireEvent.click(await screen.findByRole('button', { name: /删除/ }));
    fireEvent.click(await screen.findByRole('button', { name: /确\s*认/ }));

    await waitFor(() => {
      expect(service.deleteAgent).toHaveBeenCalledWith('coder');
    });
  });

  it('shows API error message', async () => {
    vi.mocked(service.listAgents).mockResolvedValue({
      code: 1005,
      data: [],
      message: '配置文件读写失败',
    });

    render(<Agents />);

    expect(await screen.findByText('配置文件读写失败')).toBeInTheDocument();
  });
});
