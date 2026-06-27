import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigFileService } from '../config/config-file.service';
import { ToolsService } from './tools.service';

const shellTool = {
  name: 'shell',
  description: 'Run shell commands',
  builtIn: true,
  enabled: true,
};

describe('ToolsService', () => {
  let rootDir: string;
  let service: ToolsService;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'crazyclaw-tools-'));
    service = new ToolsService(new ConfigFileService(rootDir));
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('returns an empty list when config does not exist', async () => {
    await expect(service.findAll()).resolves.toEqual({
      code: 0,
      data: [],
      message: 'Tools loaded',
    });
  });

  it('creates tool config in object form', async () => {
    const result = await service.create(shellTool);

    expect(result).toEqual({
      code: 0,
      data: shellTool,
      message: 'Tool created',
    });
    const config = JSON.parse(
      await readFile(join(rootDir, 'crazyclaw.json'), 'utf8'),
    );
    expect(config.tools).toEqual({ shell: shellTool });
  });

  it('migrates array-shaped tools config to object form on write', async () => {
    await writeFile(
      join(rootDir, 'crazyclaw.json'),
      `${JSON.stringify({
        tools: [shellTool],
      })}\n`,
    );

    await service.create({
      name: 'filesystem',
      description: '',
      builtIn: false,
      enabled: true,
    });

    const config = JSON.parse(
      await readFile(join(rootDir, 'crazyclaw.json'), 'utf8'),
    );
    expect(config.tools).toEqual({
      shell: shellTool,
      filesystem: expect.objectContaining({ name: 'filesystem' }),
    });
  });

  it('rejects duplicates, missing tools, and invalid payloads', async () => {
    await service.create(shellTool);

    await expect(service.create(shellTool)).resolves.toMatchObject({
      code: 1202,
      data: null,
    });
    await expect(service.findOne('missing')).resolves.toMatchObject({
      code: 1201,
      data: null,
    });
    await expect(
      service.create({ ...shellTool, name: '../bad' }),
    ).resolves.toMatchObject({ code: 1203, data: null });
    await expect(
      service.create({ ...shellTool, enabled: 'yes' as never }),
    ).resolves.toMatchObject({ code: 1203, data: null });
  });

  it('updates description and enabled without changing name or builtIn', async () => {
    await service.create(shellTool);

    await expect(
      service.update('shell', { ...shellTool, name: 'other' }),
    ).resolves.toMatchObject({ code: 1203, data: null });

    const result = await service.update('shell', {
      name: 'shell',
      description: 'Updated',
      builtIn: false,
      enabled: false,
    });

    expect(result).toEqual({
      code: 0,
      data: {
        name: 'shell',
        description: 'Updated',
        builtIn: true,
        enabled: false,
      },
      message: 'Tool updated',
    });
  });

  it('does not delete built-in tools', async () => {
    await service.create(shellTool);

    await expect(service.remove('shell')).resolves.toEqual({
      code: 1204,
      data: null,
      message: 'Built-in tool cannot be deleted',
    });
  });

  it('deletes custom tools without touching agents', async () => {
    await writeFile(
      join(rootDir, 'crazyclaw.json'),
      `${JSON.stringify({
        tools: {
          filesystem: {
            name: 'filesystem',
            description: '',
            builtIn: false,
            enabled: true,
          },
        },
        agents: [
          {
            id: 'coder',
            description: '',
            enabled: true,
            workspaces: [join(rootDir, 'coder')],
            tools: ['filesystem'],
          },
        ],
      })}\n`,
    );

    await expect(service.remove('filesystem')).resolves.toEqual({
      code: 0,
      data: { name: 'filesystem' },
      message: 'Tool deleted',
    });
    const config = JSON.parse(
      await readFile(join(rootDir, 'crazyclaw.json'), 'utf8'),
    );
    expect(config.tools).toEqual({});
    expect(config.agents[0].tools).toEqual(['filesystem']);
  });
});
