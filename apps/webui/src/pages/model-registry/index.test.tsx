import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Models from './index';
import * as service from './service';
import type { ModelView } from './service';

vi.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ children, extra }: any) => (
    <main>
      <div>{extra}</div>
      {children}
    </main>
  ),
}));

vi.mock('./service', () => ({
  createModel: vi.fn(),
  deleteModel: vi.fn(),
  listModels: vi.fn(),
  testModel: vi.fn(),
  updateModel: vi.fn(),
}));

const gpt: ModelView = {
  id: 'gpt',
  provider: 'openai' as const,
  modelId: 'gpt-4o-mini',
  enabled: true,
  baseUrl: 'https://api.openai.com/v1',
  input: ['text', 'image'],
  hasApiKey: true,
  maskedApiKey: 'sk-t********cret',
};

describe('Models page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(service.listModels).mockResolvedValue({
      code: 0,
      data: [gpt],
      message: 'Models loaded',
    });
    vi.mocked(service.createModel).mockResolvedValue({
      code: 0,
      data: gpt,
      message: 'Model created',
    });
    vi.mocked(service.updateModel).mockResolvedValue({
      code: 0,
      data: gpt,
      message: 'Model updated',
    });
    vi.mocked(service.deleteModel).mockResolvedValue({
      code: 0,
      data: { id: 'gpt' },
      message: 'Model deleted',
    });
    vi.mocked(service.testModel).mockResolvedValue({
      code: 0,
      data: {
        id: 'gpt',
        provider: 'openai',
        mode: 'text',
        ok: true,
        durationMs: 12,
        message: 'Model test passed',
      },
      message: 'Model test passed',
    });
  });

  it('loads models and renders cards', async () => {
    render(<Models />);

    expect(await screen.findByText('gpt')).toBeInTheDocument();
    expect(screen.getByText('openai')).toBeInTheDocument();
    expect(screen.getByText('gpt-4o-mini')).toBeInTheDocument();
    expect(screen.getByText('https://api.openai.com/v1')).toBeInTheDocument();
    expect(screen.getByText('已配置密钥')).toBeInTheDocument();
    expect(screen.getByText('image')).toBeInTheDocument();
  });

  it('creates a model from the form', async () => {
    vi.mocked(service.listModels)
      .mockResolvedValueOnce({ code: 0, data: [], message: 'Models loaded' })
      .mockResolvedValueOnce({ code: 0, data: [gpt], message: 'Models loaded' });

    render(<Models />);
    fireEvent.click(await screen.findByRole('button', { name: /新增 Model/ }));
    fireEvent.change(screen.getByLabelText('模型名称'), {
      target: { value: 'gpt' },
    });
    fireEvent.change(screen.getByLabelText('模型 ID'), {
      target: { value: 'gpt-4o-mini' },
    });
    fireEvent.change(screen.getByLabelText('Base URL'), {
      target: { value: 'https://api.openai.com/v1' },
    });
    fireEvent.change(screen.getByLabelText('API Key'), {
      target: { value: 'sk-test-secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(service.createModel).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'gpt',
          provider: 'openai',
          modelId: 'gpt-4o-mini',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'sk-test-secret',
          enabled: true,
        }),
      );
    });
  });

  it('edits a model with readonly id and blank apiKey', async () => {
    render(<Models />);
    fireEvent.click(await screen.findByRole('button', { name: '编辑 Model' }));

    expect(screen.getByLabelText('模型名称')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(service.updateModel).toHaveBeenCalledWith(
        'gpt',
        expect.objectContaining({ id: 'gpt', modelId: 'gpt-4o-mini', apiKey: '' }),
      );
    });
  });

  it('toggles enabled state from the card', async () => {
    render(<Models />);
    fireEvent.click(await screen.findByRole('button', { name: '禁用 Model' }));

    await waitFor(() => {
      expect(service.updateModel).toHaveBeenCalledWith(
        'gpt',
        expect.objectContaining({ id: 'gpt', enabled: false }),
      );
    });
  });

  it('tests text and image modes from the card', async () => {
    render(<Models />);
    fireEvent.click(await screen.findByRole('button', { name: '测试文本' }));
    fireEvent.click(await screen.findByRole('button', { name: '测试多模态' }));

    await waitFor(() => {
      expect(service.testModel).toHaveBeenCalledWith('gpt', { mode: 'text' });
      expect(service.testModel).toHaveBeenCalledWith('gpt', { mode: 'image' });
    });
  });

  it('disables image test when image input is not configured', async () => {
    vi.mocked(service.listModels).mockResolvedValue({
      code: 0,
      data: [{ ...gpt, input: ['text'] }],
      message: 'Models loaded',
    });

    render(<Models />);

    expect(await screen.findByRole('button', { name: '测试多模态' })).toBeDisabled();
  });

  it('deletes after confirmation', async () => {
    render(<Models />);
    fireEvent.click(await screen.findByRole('button', { name: '删除 Model' }));
    fireEvent.click(await screen.findByRole('button', { name: /确\s*认/ }));

    await waitFor(() => {
      expect(service.deleteModel).toHaveBeenCalledWith('gpt');
    });
  });

  it('shows API error message', async () => {
    vi.mocked(service.listModels).mockResolvedValue({
      code: 1105,
      data: [],
      message: '配置文件读写失败',
    });

    render(<Models />);

    expect(await screen.findByText('配置文件读写失败')).toBeInTheDocument();
  });
});
