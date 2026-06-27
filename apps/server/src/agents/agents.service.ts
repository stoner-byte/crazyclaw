import { Injectable } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { apiBadRequest, apiFail, apiOk } from '../api/response';
import type { ApiResponse } from '../api/types';
import { ConfigFileService } from '../config/config-file.service';
import {
  AGENT_CODES,
  AgentConfig,
  AgentPayload,
  AgentView,
} from './agents.types';

const PROMPT_FILE = 'CRAZY.md';
const VALID_ID = /^[A-Za-z0-9_-]+$/;

@Injectable()
export class AgentsService {
  constructor(private readonly configFile: ConfigFileService = new ConfigFileService()) {}

  async findAll(): Promise<ApiResponse<AgentView[]>> {
    return this.safe(async () => {
      const config = await this.readConfig();
      const agents = await Promise.all(
        config.agents.map((agent) => this.toView(agent)),
      );
      return apiOk(agents, 'Agents loaded');
    });
  }

  async findOne(id: string): Promise<ApiResponse<AgentView | null>> {
    if (!this.isValidId(id)) {
      return apiBadRequest(AGENT_CODES.BAD_REQUEST, 'Invalid agent id');
    }
    return this.safe(async () => {
      const config = await this.readConfig();
      const agent = findAgent(config.agents, id);
      if (!agent) return apiFail(AGENT_CODES.NOT_FOUND, 'Agent not found');
      return apiOk(await this.toView(agent), 'Agent loaded');
    });
  }

  async create(payload: AgentPayload): Promise<ApiResponse<AgentView | null>> {
    const normalized = this.normalizeCreate(payload);
    if (!normalized) {
      return apiBadRequest(AGENT_CODES.BAD_REQUEST, 'Invalid agent payload');
    }

    return this.safe(async () => {
      const config = await this.readConfig();
      if (findAgent(config.agents, normalized.id)) {
        return apiFail(AGENT_CODES.ALREADY_EXISTS, 'Agent already exists');
      }

      await mkdir(this.defaultWorkspace(normalized.id), { recursive: true });
      await this.writePrompt(normalized.id, normalized.systemPrompt);
      config.agents.push(stripPrompt(normalized));
      await this.writeConfig(config);

      return apiOk(normalized, 'Agent created');
    });
  }

  async update(
    id: string,
    payload: AgentPayload,
  ): Promise<ApiResponse<AgentView | null>> {
    if (!this.isValidId(id) || payload.id !== id) {
      return apiBadRequest(AGENT_CODES.BAD_REQUEST, 'Agent id cannot be changed');
    }

    return this.safe(async () => {
      const config = await this.readConfig();
      const index = findAgentIndex(config.agents, id);
      if (index === -1) {
        return apiFail(AGENT_CODES.NOT_FOUND, 'Agent not found');
      }

      const normalized = this.normalizeUpdate(id, payload);
      if (!normalized) {
        return apiBadRequest(AGENT_CODES.BAD_REQUEST, 'Invalid agent payload');
      }
      if (normalized.workspaces[0] !== this.defaultWorkspace(id)) {
        return apiFail(
          AGENT_CODES.DEFAULT_WORKSPACE_LOCKED,
          'Default workspace cannot be changed',
        );
      }

      await mkdir(this.defaultWorkspace(id), { recursive: true });
      await this.writePrompt(id, normalized.systemPrompt);
      config.agents[index] = stripPrompt(normalized);
      await this.writeConfig(config);

      return apiOk(normalized, 'Agent updated');
    });
  }

  async remove(id: string): Promise<ApiResponse<{ id: string } | null>> {
    if (!this.isValidId(id)) {
      return apiBadRequest(AGENT_CODES.BAD_REQUEST, 'Invalid agent id');
    }
    return this.safe(async () => {
      const config = await this.readConfig();
      const index = findAgentIndex(config.agents, id);
      if (index === -1) {
        return apiFail(AGENT_CODES.NOT_FOUND, 'Agent not found');
      }
      config.agents.splice(index, 1);
      await this.writeConfig(config);
      return apiOk({ id }, 'Agent deleted');
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
    return join(this.configFile.rootDir, id);
  }

  private promptPath(id: string): string {
    return join(this.defaultWorkspace(id), PROMPT_FILE);
  }

  private async readConfig() {
    return this.configFile.readConfig();
  }

  private async writeConfig(config: Awaited<ReturnType<ConfigFileService['readConfig']>>): Promise<void> {
    await this.configFile.writeConfig(config);
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
      return apiFail(
        AGENT_CODES.CONFIG_IO_ERROR,
        'Config file read/write failed',
      );
    }
  }
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

function findAgent(agents: AgentConfig[], id: string): AgentConfig | undefined {
  return agents.find((agent) => agent.id === id);
}

function findAgentIndex(agents: AgentConfig[], id: string): number {
  return agents.findIndex((agent) => agent.id === id);
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}
