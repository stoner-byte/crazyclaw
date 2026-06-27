import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigFileService } from '../config/config-file.service';
import { AgentsService } from './agents.service';

describe('AgentsService', () => {
  let rootDir: string;
  let service: AgentsService;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'crazyclaw-agents-'));
    service = new AgentsService(new ConfigFileService(rootDir));
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('returns an empty list when config does not exist', async () => {
    await expect(service.findAll()).resolves.toEqual({
      code: 0,
      data: [],
      message: 'Agents loaded',
    });
  });

  it('creates agent config, default workspace, and CRAZY.md', async () => {
    const result = await service.create({
      id: 'coder',
      description: 'Coding assistant',
      enabled: true,
      tools: ['shell'],
      systemPrompt: 'You are a coding agent.',
    });

    const defaultWorkspace = join(rootDir, 'coder');
    expect(result).toEqual({
      code: 0,
      data: {
        id: 'coder',
        description: 'Coding assistant',
        enabled: true,
        tools: ['shell'],
        workspaces: [defaultWorkspace],
        systemPrompt: 'You are a coding agent.',
      },
      message: 'Agent created',
    });
    await expect(stat(defaultWorkspace)).resolves.toBeTruthy();
    await expect(readFile(join(defaultWorkspace, 'CRAZY.md'), 'utf8')).resolves.toBe(
      'You are a coding agent.',
    );
    const config = JSON.parse(
      await readFile(join(rootDir, 'crazyclaw.json'), 'utf8'),
    );
    expect(config.agents).toEqual([
      {
        id: 'coder',
        description: 'Coding assistant',
        enabled: true,
        tools: ['shell'],
        workspaces: [defaultWorkspace],
      },
    ]);
    expect(config.agents[0].systemPrompt).toBeUndefined();
  });

  it('preserves models config when writing agents', async () => {
    await writeFile(
      join(rootDir, 'crazyclaw.json'),
      `${JSON.stringify({
        models: [
          {
            id: 'gpt',
            provider: 'openai',
            modelId: 'gpt-4o-mini',
            enabled: true,
            baseUrl: 'https://api.openai.com/v1',
            apiKey: 'secret-key',
            input: ['text'],
          },
        ],
      })}\n`,
    );

    await service.create({
      id: 'coder',
      description: '',
      enabled: true,
      tools: [],
      systemPrompt: '',
    });

    const config = JSON.parse(
      await readFile(join(rootDir, 'crazyclaw.json'), 'utf8'),
    );
    expect(config.models).toEqual([
      expect.objectContaining({ id: 'gpt', apiKey: 'secret-key' }),
    ]);
    expect(config.agents).toEqual([expect.objectContaining({ id: 'coder' })]);
  });

  it('migrates legacy object-shaped agents config to an array on write', async () => {
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

    await service.create({
      id: 'reviewer',
      description: '',
      enabled: true,
      tools: [],
      systemPrompt: '',
    });

    const config = JSON.parse(
      await readFile(join(rootDir, 'crazyclaw.json'), 'utf8'),
    );
    expect(config.agents).toEqual([
      expect.objectContaining({ id: 'coder' }),
      expect.objectContaining({ id: 'reviewer' }),
    ]);
  });

  it('rejects duplicate agents', async () => {
    await service.create({
      id: 'coder',
      description: '',
      enabled: true,
      tools: [],
      systemPrompt: '',
    });

    await expect(
      service.create({
        id: 'coder',
        description: '',
        enabled: true,
        tools: [],
        systemPrompt: '',
      }),
    ).resolves.toMatchObject({ code: 1002, data: null });
  });

  it('returns code 1001 for missing agent', async () => {
    await expect(service.findOne('missing')).resolves.toMatchObject({
      code: 1001,
      data: null,
    });
  });

  it('rejects editing id or default workspace', async () => {
    await service.create({
      id: 'coder',
      description: '',
      enabled: true,
      tools: [],
      systemPrompt: '',
    });

    await expect(
      service.update('coder', {
        id: 'other',
        description: '',
        enabled: true,
        tools: [],
        workspaces: [join(rootDir, 'coder')],
        systemPrompt: '',
      }),
    ).resolves.toMatchObject({ code: 1003, data: null });
    await expect(
      service.update('coder', {
        id: 'coder',
        description: '',
        enabled: true,
        tools: [],
        workspaces: [join(rootDir, 'other')],
        systemPrompt: '',
      }),
    ).resolves.toMatchObject({ code: 1004, data: null });
  });

  it('updates CRAZY.md without storing systemPrompt in JSON', async () => {
    await service.create({
      id: 'coder',
      description: '',
      enabled: true,
      tools: [],
      systemPrompt: 'old',
    });

    const result = await service.update('coder', {
      id: 'coder',
      description: 'updated',
      enabled: false,
      tools: ['git'],
      workspaces: [join(rootDir, 'coder'), '/tmp/project'],
      systemPrompt: 'new prompt',
    });

    expect(result.code).toBe(0);
    expect(result.data?.systemPrompt).toBe('new prompt');
    await expect(readFile(join(rootDir, 'coder', 'CRAZY.md'), 'utf8')).resolves.toBe(
      'new prompt',
    );
    const config = JSON.parse(
      await readFile(join(rootDir, 'crazyclaw.json'), 'utf8'),
    );
    expect(config.agents[0].systemPrompt).toBeUndefined();
    expect(config.agents[0].workspaces).toEqual([
      join(rootDir, 'coder'),
      '/tmp/project',
    ]);
  });

  it('deletes only the JSON entry', async () => {
    await service.create({
      id: 'coder',
      description: '',
      enabled: true,
      tools: [],
      systemPrompt: 'keep me',
    });

    await expect(service.remove('coder')).resolves.toEqual({
      code: 0,
      data: { id: 'coder' },
      message: 'Agent deleted',
    });
    await expect(stat(join(rootDir, 'coder', 'CRAZY.md'))).resolves.toBeTruthy();
    await expect(service.findOne('coder')).resolves.toMatchObject({
      code: 1001,
      data: null,
    });
  });

  it('rejects invalid payloads', async () => {
    await expect(
      service.create({
        id: '../bad',
        description: '',
        enabled: true,
        tools: [],
        systemPrompt: '',
      }),
    ).resolves.toMatchObject({ code: 1003, data: null });
    await expect(
      service.create({
        id: 'badtools',
        description: '',
        enabled: true,
        tools: [123],
        systemPrompt: '',
      } as never),
    ).resolves.toMatchObject({ code: 1003, data: null });
  });
});
