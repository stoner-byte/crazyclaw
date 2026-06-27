import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigFileService } from '../config/config-file.service';
import { ModelsService } from './models.service';

const modelPayload = {
  id: 'gpt',
  provider: 'openai' as const,
  modelId: 'gpt-4o-mini',
  enabled: true,
  baseUrl: 'https://api.openai.com/v1',
  apiKey: 'sk-test-secret',
  input: ['text', 'image'],
};

describe('ModelsService', () => {
  let rootDir: string;
  let service: ModelsService;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'crazyclaw-models-'));
    service = new ModelsService(new ConfigFileService(rootDir));
    fetchMock = jest.fn().mockResolvedValue(jsonResponse(openAITextResponse('pong')));
    global.fetch = fetchMock;
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await rm(rootDir, { recursive: true, force: true });
  });

  it('returns an empty list when config does not exist', async () => {
    await expect(service.findAll()).resolves.toEqual({
      code: 0,
      data: [],
      message: 'Models loaded',
    });
  });

  it('creates model config and returns a masked view', async () => {
    const result = await service.create(modelPayload);

    expect(result).toEqual({
      code: 0,
      data: {
        id: 'gpt',
        provider: 'openai',
        modelId: 'gpt-4o-mini',
        enabled: true,
        baseUrl: 'https://api.openai.com/v1',
        input: ['text', 'image'],
        hasApiKey: true,
        maskedApiKey: 'sk-t********cret',
      },
      message: 'Model created',
    });

    const config = JSON.parse(
      await readFile(join(rootDir, 'crazyclaw.json'), 'utf8'),
    );
    expect(config.models).toEqual([
      expect.objectContaining({ id: 'gpt', apiKey: 'sk-test-secret' }),
    ]);
    expect(JSON.stringify(result.data)).not.toContain('sk-test-secret');
  });

  it('rejects duplicate models and missing models', async () => {
    await service.create(modelPayload);

    await expect(service.create(modelPayload)).resolves.toMatchObject({
      code: 1102,
      data: null,
    });
    await expect(service.findOne('missing')).resolves.toMatchObject({
      code: 1101,
      data: null,
    });
  });

  it('rejects editing id and keeps old apiKey when update leaves it blank', async () => {
    await service.create(modelPayload);

    await expect(
      service.update('gpt', { ...modelPayload, id: 'other' }),
    ).resolves.toMatchObject({ code: 1103, data: null });

    const result = await service.update('gpt', {
      ...modelPayload,
      apiKey: '',
      input: ['text'],
    });

    expect(result).toMatchObject({
      code: 0,
      data: {
        id: 'gpt',
        hasApiKey: true,
        maskedApiKey: 'sk-t********cret',
        input: ['text'],
      },
    });
    const config = JSON.parse(
      await readFile(join(rootDir, 'crazyclaw.json'), 'utf8'),
    );
    expect(config.models).toEqual([
      expect.objectContaining({ id: 'gpt', apiKey: 'sk-test-secret' }),
    ]);
  });

  it('deletes only the models entry and preserves agents config', async () => {
    await writeFile(
      join(rootDir, 'crazyclaw.json'),
      `${JSON.stringify({
        agents: {
          coder: {
            id: 'coder',
            description: '',
            enabled: true,
            tools: [],
            workspaces: [join(rootDir, 'coder')],
          },
        },
      })}\n`,
    );
    await service.create(modelPayload);

    await expect(service.remove('gpt')).resolves.toEqual({
      code: 0,
      data: { id: 'gpt' },
      message: 'Model deleted',
    });

    const config = JSON.parse(
      await readFile(join(rootDir, 'crazyclaw.json'), 'utf8'),
    );
    expect(config.models).toEqual([]);
    expect(config.agents.coder.id).toBe('coder');
  });

  it('rejects invalid payloads', async () => {
    await expect(
      service.create({ ...modelPayload, id: '../bad' }),
    ).resolves.toMatchObject({ code: 1103, data: null });
    await expect(
      service.create({ ...modelPayload, provider: 'bad' as never }),
    ).resolves.toMatchObject({ code: 1103, data: null });
    await expect(
      service.create({ ...modelPayload, baseUrl: 'not-url' }),
    ).resolves.toMatchObject({ code: 1103, data: null });
    await expect(
      service.create({ ...modelPayload, input: ['text', 123] as never }),
    ).resolves.toMatchObject({ code: 1103, data: null });
    await expect(
      service.create({ ...modelPayload, input: ['text', 'tool'] as never }),
    ).resolves.toMatchObject({ code: 1103, data: null });
  });

  it('tests OpenAI compatible text and image modes', async () => {
    await service.create(modelPayload);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(openAITextResponse('pong')))
      .mockResolvedValueOnce(jsonResponse(openAITextResponse('red')));

    await expect(service.test('gpt', { mode: 'text' })).resolves.toMatchObject({
      code: 0,
      data: { id: 'gpt', provider: 'openai', mode: 'text', ok: true },
    });
    await expect(service.test('gpt', { mode: 'image' })).resolves.toMatchObject({
      code: 0,
      data: { id: 'gpt', provider: 'openai', mode: 'image', ok: true },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test-secret',
        }),
      }),
    );
    expect(fetchMock.mock.calls[1][1].body).toContain(
      'data:image/png;base64',
    );
  });

  it('rejects OpenAI compatible success responses without usable text', async () => {
    await service.create(modelPayload);
    fetchMock.mockResolvedValueOnce(jsonResponse({ choices: [] }));

    await expect(service.test('gpt', { mode: 'text' })).resolves.toMatchObject({
      code: 1104,
      data: null,
      message: 'Model test failed: invalid response shape',
    });
  });

  it('rejects OpenAI compatible image responses that do not recognize the image', async () => {
    await service.create(modelPayload);
    fetchMock.mockResolvedValueOnce(jsonResponse(openAITextResponse('ok')));

    await expect(service.test('gpt', { mode: 'image' })).resolves.toMatchObject({
      code: 1104,
      data: null,
      message: 'Image test failed: model did not recognize the red image',
    });
  });

  it('routes Anthropic and Ollama tests to provider-specific endpoints', async () => {
    await service.create({
      ...modelPayload,
      id: 'claude',
      provider: 'anthropic',
      modelId: 'claude-3-5-sonnet-latest',
      baseUrl: 'https://api.anthropic.com/v1',
    });
    await service.create({
      ...modelPayload,
      id: 'qwen',
      provider: 'ollama',
      modelId: 'qwen3',
      baseUrl: 'http://localhost:11434/v1',
      apiKey: '',
    });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(anthropicTextResponse('pong')))
      .mockResolvedValueOnce(jsonResponse(ollamaTextResponse('red')));

    await service.test('claude', { mode: 'text' });
    await service.test('qwen', { mode: 'image' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:11434/api/chat',
      expect.any(Object),
    );
  });

  it('returns test failure and unsupported test codes', async () => {
    await service.create(modelPayload);
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized sk-test-secret',
    });

    await expect(service.test('gpt', { mode: 'text' })).resolves.toMatchObject({
      code: 1104,
      data: null,
      message: 'Model test failed: 401 Unauthorized [REDACTED]',
    });
    await expect(
      service.test('gpt', { mode: 'audio' as never }),
    ).resolves.toMatchObject({ code: 1106, data: null });
  });

  it('returns request failure without leaking api keys on network errors', async () => {
    await service.create(modelPayload);
    fetchMock.mockRejectedValueOnce(new Error('connect ECONNREFUSED sk-test-secret'));

    await expect(service.test('gpt', { mode: 'text' })).resolves.toMatchObject({
      code: 1104,
      data: null,
      message: 'Model test failed: request failed',
    });
  });
});

function jsonResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(data),
  };
}

function openAITextResponse(content: string) {
  return { choices: [{ message: { content } }] };
}

function anthropicTextResponse(text: string) {
  return { content: [{ type: 'text', text }] };
}

function ollamaTextResponse(content: string) {
  return { message: { content } };
}
