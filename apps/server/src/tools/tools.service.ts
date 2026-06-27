import { Injectable } from '@nestjs/common';
import { apiBadRequest, apiFail, apiOk } from '../api/response';
import type { ApiResponse } from '../api/types';
import { ConfigFileService } from '../config/config-file.service';
import {
  TOOL_CODES,
  ToolConfig,
  ToolPayload,
  ToolView,
} from './tools.types';

const VALID_NAME = /^[A-Za-z0-9_-]+$/;

@Injectable()
export class ToolsService {
  constructor(private readonly configFile: ConfigFileService = new ConfigFileService()) {}

  async findAll(): Promise<ApiResponse<ToolView[]>> {
    return this.safe(async () =>
      apiOk(Object.values((await this.configFile.readConfig()).tools), 'Tools loaded'),
    );
  }

  async findOne(name: string): Promise<ApiResponse<ToolView | null>> {
    if (!isValidName(name)) {
      return apiBadRequest(TOOL_CODES.BAD_REQUEST, 'Invalid tool name');
    }
    return this.safe(async () => {
      const tool = (await this.configFile.readConfig()).tools[name];
      if (!tool) return apiFail(TOOL_CODES.NOT_FOUND, 'Tool not found');
      return apiOk(tool, 'Tool loaded');
    });
  }

  async create(payload: ToolPayload): Promise<ApiResponse<ToolView | null>> {
    const normalized = normalizePayload(payload);
    if (!normalized) {
      return apiBadRequest(TOOL_CODES.BAD_REQUEST, 'Invalid tool payload');
    }

    return this.safe(async () => {
      const config = await this.configFile.readConfig();
      if (config.tools[normalized.name]) {
        return apiFail(TOOL_CODES.ALREADY_EXISTS, 'Tool already exists');
      }
      config.tools[normalized.name] = normalized;
      await this.configFile.writeConfig(config);
      return apiOk(normalized, 'Tool created');
    });
  }

  async update(
    name: string,
    payload: ToolPayload,
  ): Promise<ApiResponse<ToolView | null>> {
    if (!isValidName(name) || payload.name !== name) {
      return apiBadRequest(TOOL_CODES.BAD_REQUEST, 'Tool name cannot be changed');
    }

    return this.safe(async () => {
      const config = await this.configFile.readConfig();
      const existing = config.tools[name];
      if (!existing) return apiFail(TOOL_CODES.NOT_FOUND, 'Tool not found');

      const normalized = normalizePayload(payload, existing);
      if (!normalized) {
        return apiBadRequest(TOOL_CODES.BAD_REQUEST, 'Invalid tool payload');
      }
      config.tools[name] = normalized;
      await this.configFile.writeConfig(config);
      return apiOk(normalized, 'Tool updated');
    });
  }

  async remove(name: string): Promise<ApiResponse<{ name: string } | null>> {
    if (!isValidName(name)) {
      return apiBadRequest(TOOL_CODES.BAD_REQUEST, 'Invalid tool name');
    }
    return this.safe(async () => {
      const config = await this.configFile.readConfig();
      const tool = config.tools[name];
      if (!tool) return apiFail(TOOL_CODES.NOT_FOUND, 'Tool not found');
      if (tool.builtIn) {
        return apiFail(
          TOOL_CODES.BUILT_IN_LOCKED,
          'Built-in tool cannot be deleted',
        );
      }
      delete config.tools[name];
      await this.configFile.writeConfig(config);
      return apiOk({ name }, 'Tool deleted');
    });
  }

  private async safe<T>(
    action: () => Promise<ApiResponse<T>>,
  ): Promise<ApiResponse<T>> {
    try {
      return await action();
    } catch {
      return apiFail(
        TOOL_CODES.CONFIG_IO_ERROR,
        'Config file read/write failed',
      );
    }
  }
}

function normalizePayload(
  payload: ToolPayload,
  existing?: ToolConfig,
): ToolConfig | null {
  if (!isValidName(payload.name)) return null;
  if (payload.description !== undefined && typeof payload.description !== 'string') {
    return null;
  }
  if (payload.builtIn !== undefined && typeof payload.builtIn !== 'boolean') {
    return null;
  }
  if (payload.enabled !== undefined && typeof payload.enabled !== 'boolean') {
    return null;
  }

  return {
    name: payload.name,
    description: payload.description ?? existing?.description ?? '',
    builtIn: existing?.builtIn ?? payload.builtIn ?? false,
    enabled: payload.enabled ?? existing?.enabled ?? true,
  };
}

function isValidName(value: unknown): value is string {
  return typeof value === 'string' && VALID_NAME.test(value);
}
