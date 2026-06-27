import { Inject, Injectable } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AgentConfig } from '../agents/agents.types';
import type { ModelConfig } from '../models/models.types';

export const CRAZYCLAW_ROOT = Symbol('CRAZYCLAW_ROOT');
export const DEFAULT_CRAZYCLAW_ROOT = join(homedir(), '.crazyclaw');

const CONFIG_FILE = 'crazyclaw.json';

export type CrazyclawConfig = {
  agents: AgentConfig[];
  models: ModelConfig[];
  [key: string]: unknown;
};

@Injectable()
export class ConfigFileService {
  constructor(
    @Inject(CRAZYCLAW_ROOT)
    public readonly rootDir: string = DEFAULT_CRAZYCLAW_ROOT,
  ) {}

  async readConfig(): Promise<CrazyclawConfig> {
    try {
      const raw = await readFile(this.configPath(), 'utf8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return normalizeConfig(parsed);
    } catch (error) {
      if (isNotFound(error)) return normalizeConfig({});
      throw error;
    }
  }

  async writeConfig(config: CrazyclawConfig): Promise<void> {
    await mkdir(this.rootDir, { recursive: true });
    await writeFile(this.configPath(), `${JSON.stringify(config, null, 2)}\n`);
  }

  configPath(): string {
    return join(this.rootDir, CONFIG_FILE);
  }
}

function normalizeConfig(config: Record<string, unknown>): CrazyclawConfig {
  return {
    ...config,
    agents: normalizeAgents(config.agents),
    models: normalizeModels(config.models),
  };
}

function normalizeAgents(value: unknown): AgentConfig[] {
  if (Array.isArray(value)) return value as AgentConfig[];
  if (isRecord(value)) return Object.values(value) as AgentConfig[];
  return [];
}

function normalizeModels(value: unknown): ModelConfig[] {
  if (Array.isArray(value)) return value as ModelConfig[];
  if (isRecord(value)) return Object.values(value) as ModelConfig[];
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}
