import { Inject, Injectable } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { ApiResponse } from '../types/api';
import {
  AGENT_CODES,
  AgentConfig,
  AgentPayload,
  AgentView,
  CrazyclawConfig,
} from './agents.types';

export const CRAZYCLAW_ROOT = Symbol('CRAZYCLAW_ROOT');

const CONFIG_FILE = 'crazyclaw.json';
const PROMPT_FILE = 'CRAZY.md';
const VALID_ID = /^[A-Za-z0-9_-]+$/;

@Injectable()
export class AgentsService {
  constructor(
    @Inject(CRAZYCLAW_ROOT)
    private readonly rootDir: string = join(homedir(), '.crazyclaw'),
  ) {}

  async findAll(): Promise<ApiResponse<AgentView[]>> {
    return this.safe(async () => {
      const config = await this.readConfig();
      const agents = await Promise.all(
        Object.values(config.agents).map((agent) => this.toView(agent)),
      );
      return ok(agents, 'Agents loaded');
    });
  }

  async findOne(id: string): Promise<ApiResponse<AgentView | null>> {
    if (!this.isValidId(id)) return badRequest('Invalid agent id');
    return this.safe(async () => {
      const config = await this.readConfig();
      const agent = config.agents[id];
      if (!agent) return fail(AGENT_CODES.NOT_FOUND, 'Agent not found');
      return ok(await this.toView(agent), 'Agent loaded');
    });
  }

  async create(payload: AgentPayload): Promise<ApiResponse<AgentView | null>> {
    const normalized = this.normalizeCreate(payload);
    if (!normalized) return badRequest('Invalid agent payload');

    return this.safe(async () => {
      const config = await this.readConfig();
      if (config.agents[normalized.id]) {
        return fail(AGENT_CODES.ALREADY_EXISTS, 'Agent already exists');
      }

      await mkdir(this.defaultWorkspace(normalized.id), { recursive: true });
      await this.writePrompt(normalized.id, normalized.systemPrompt);
      config.agents[normalized.id] = stripPrompt(normalized);
      await this.writeConfig(config);

      return ok(await this.toView(config.agents[normalized.id]), 'Agent created');
    });
  }

  async update(
    id: string,
    payload: AgentPayload,
  ): Promise<ApiResponse<AgentView | null>> {
    if (!this.isValidId(id) || payload.id !== id) {
      return badRequest('Agent id cannot be changed');
    }

    return this.safe(async () => {
      const config = await this.readConfig();
      if (!config.agents[id]) return fail(AGENT_CODES.NOT_FOUND, 'Agent not found');

      const normalized = this.normalizeUpdate(id, payload);
      if (!normalized) return badRequest('Invalid agent payload');
      if (normalized.workspaces[0] !== this.defaultWorkspace(id)) {
        return fail(
          AGENT_CODES.DEFAULT_WORKSPACE_LOCKED,
          'Default workspace cannot be changed',
        );
      }

      await mkdir(this.defaultWorkspace(id), { recursive: true });
      await this.writePrompt(id, normalized.systemPrompt);
      config.agents[id] = stripPrompt(normalized);
      await this.writeConfig(config);

      return ok(await this.toView(config.agents[id]), 'Agent updated');
    });
  }

  async remove(id: string): Promise<ApiResponse<{ id: string } | null>> {
    if (!this.isValidId(id)) return badRequest('Invalid agent id');
    return this.safe(async () => {
      const config = await this.readConfig();
      if (!config.agents[id]) return fail(AGENT_CODES.NOT_FOUND, 'Agent not found');
      delete config.agents[id];
      await this.writeConfig(config);
      return ok({ id }, 'Agent deleted');
    });
  }

  private normalizeCreate(payload: AgentPayload): AgentView | null {
    if (!this.isValidId(payload.id)) return null;
    const tools = normalizeStringArray(payload.tools);
    if (!tools) return null;

    return {
      id: payload.id,
      description: payload.description ?? '',
      enabled: payload.enabled ?? true,
      tools,
      workspaces: [this.defaultWorkspace(payload.id)],
      systemPrompt: payload.systemPrompt ?? '',
    };
  }

  private normalizeUpdate(id: string, payload: AgentPayload): AgentView | null {
    const tools = normalizeStringArray(payload.tools);
    if (!tools || typeof payload.enabled !== 'boolean') return null;
    if (!Array.isArray(payload.workspaces)) return null;
    const workspaces = normalizeStringArray(payload.workspaces);
    if (!workspaces || workspaces.length === 0) return null;
    if (typeof payload.systemPrompt !== 'string') return null;

    return {
      id,
      description: payload.description ?? '',
      enabled: payload.enabled,
      tools,
      workspaces,
      systemPrompt: payload.systemPrompt,
    };
  }

  private defaultWorkspace(id: string): string {
    return join(this.rootDir, id);
  }

  private promptPath(id: string): string {
    return join(this.defaultWorkspace(id), PROMPT_FILE);
  }

  private configPath(): string {
    return join(this.rootDir, CONFIG_FILE);
  }

  private async readConfig(): Promise<CrazyclawConfig> {
    try {
      const raw = await readFile(this.configPath(), 'utf8');
      const parsed = JSON.parse(raw) as Partial<CrazyclawConfig>;
      return {
        agents: isRecord(parsed.agents) ? (parsed.agents as Record<string, AgentConfig>) : {},
      };
    } catch (error) {
      if (isNotFound(error)) return { agents: {} };
      throw error;
    }
  }

  private async writeConfig(config: CrazyclawConfig): Promise<void> {
    await mkdir(this.rootDir, { recursive: true });
    await writeFile(this.configPath(), `${JSON.stringify(config, null, 2)}\n`);
  }

  private async writePrompt(id: string, prompt: string): Promise<void> {
    await mkdir(this.defaultWorkspace(id), { recursive: true });
    await writeFile(this.promptPath(id), prompt);
  }

  private async readPrompt(id: string): Promise<string> {
    try {
      return await readFile(this.promptPath(id), 'utf8');
    } catch (error) {
      if (isNotFound(error)) return '';
      throw error;
    }
  }

  private async toView(agent: AgentConfig): Promise<AgentView> {
    return {
      ...agent,
      systemPrompt: await this.readPrompt(agent.id),
    };
  }

  private isValidId(id: unknown): id is string {
    return typeof id === 'string' && VALID_ID.test(id);
  }

  private async safe<T>(
    action: () => Promise<ApiResponse<T>>,
  ): Promise<ApiResponse<T>> {
    try {
      return await action();
    } catch {
      return fail(AGENT_CODES.CONFIG_IO_ERROR, 'Config file read/write failed');
    }
  }
}

function ok<T>(data: T, message: string): ApiResponse<T> {
  return { code: AGENT_CODES.OK, data, message };
}

function fail<T = never>(code: number, message: string): ApiResponse<T> {
  return { code, data: null, message };
}

function badRequest<T = never>(message: string): ApiResponse<T> {
  return fail(AGENT_CODES.BAD_REQUEST, message);
}

function normalizeStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((item) => typeof item === 'string')) return null;
  return value;
}

function stripPrompt(agent: AgentView): AgentConfig {
  return {
    id: agent.id,
    description: agent.description,
    enabled: agent.enabled,
    tools: agent.tools,
    workspaces: agent.workspaces,
  };
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
