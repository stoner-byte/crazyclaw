import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readConfig } from './readConfig.js';

it('reads crazyclaw config and agent prompt', () => {
  const home = mkdtempSync(join(tmpdir(), 'crazyclaw-core-'));
  const rootDir = join(home, '.crazyclaw');
  const originalHome = process.env.HOME;
  try {
    process.env.HOME = home;
    const workspace = join(rootDir, 'coder');
    mkdirSync(workspace, { recursive: true });
    writeFileSync(join(workspace, 'CRAZY.md'), 'You are a coding agent.');
    writeFileSync(
      join(rootDir, 'crazyclaw.json'),
      JSON.stringify({
        agents: [
          {
            id: 'coder',
            description: 'Coding assistant',
            enabled: true,
            workspaces: [workspace],
            tools: ['shell', 'missing'],
          },
        ],
        models: [
          {
            id: 'gpt',
            provider: 'openai',
            modelId: 'gpt-4o-mini',
            enabled: true,
            baseUrl: 'https://api.openai.com/v1',
            apiKey: 'secret',
            input: ['text', 'image'],
          },
        ],
        tools: {
          shell: {
            name: 'shell',
            description: 'Run shell commands',
            builtIn: true,
            enabled: true,
          },
        },
      }),
    );

    expect(readConfig('coder', 'gpt')).toEqual({
      agentName: 'coder',
      agentConfig: {
        id: 'coder',
        description: 'Coding assistant',
        enabled: true,
        workspaces: [workspace],
        tools: ['shell', 'missing'],
        systemPrompt: 'You are a coding agent.',
      },
      modelName: 'gpt',
      modelConfig: {
        id: 'gpt',
        provider: 'openai',
        modelId: 'gpt-4o-mini',
        enabled: true,
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'secret',
        input: ['text', 'image'],
      },
    });
  } finally {
    process.env.HOME = originalHome;
    rmSync(home, { recursive: true, force: true });
  }
});

it('returns null for missing agent', () => {
  const home = mkdtempSync(join(tmpdir(), 'crazyclaw-core-'));
  const rootDir = join(home, '.crazyclaw');
  const originalHome = process.env.HOME;
  try {
    process.env.HOME = home;
    mkdirSync(rootDir, { recursive: true });
    writeFileSync(join(rootDir, 'crazyclaw.json'), JSON.stringify({}));
    expect(readConfig('missing', 'gpt')).toBeNull();
  } finally {
    process.env.HOME = originalHome;
    rmSync(home, { recursive: true, force: true });
  }
});

it('throws when model name is empty', () => {
  expect(() => readConfig('coder', '')).toThrow(
    'Model id must not be empty',
  );
});

it('returns null for missing model', () => {
  const home = mkdtempSync(join(tmpdir(), 'crazyclaw-core-'));
  const rootDir = join(home, '.crazyclaw');
  const originalHome = process.env.HOME;
  try {
    process.env.HOME = home;
    mkdirSync(rootDir, { recursive: true });
    writeFileSync(
      join(rootDir, 'crazyclaw.json'),
      JSON.stringify({
        agents: [
          {
            id: 'coder',
            description: '',
            enabled: true,
            workspaces: [],
            tools: [],
          },
        ],
        models: [],
        tools: {},
      }),
    );
    expect(readConfig('coder', 'missing')).toBeNull();
  } finally {
    process.env.HOME = originalHome;
    rmSync(home, { recursive: true, force: true });
  }
});
