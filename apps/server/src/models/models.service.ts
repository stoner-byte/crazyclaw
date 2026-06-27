import { Injectable } from '@nestjs/common';
import { apiBadRequest, apiFail, apiOk } from '../api/response';
import type { ApiResponse } from '../api/types';
import { ConfigFileService } from '../config/config-file.service';
import {
  MODEL_CODES,
  MODEL_INPUTS,
  MODEL_PROVIDERS,
  ModelConfig,
  ModelInput,
  ModelPayload,
  ModelProvider,
  ModelTestPayload,
  ModelTestResult,
  ModelView,
} from './models.types';
import { getModelTestAdapter } from './testers';

const VALID_ID = /^[A-Za-z0-9_-]+$/;

@Injectable()
export class ModelsService {
  constructor(private readonly configFile: ConfigFileService = new ConfigFileService()) {}

  async findAll(): Promise<ApiResponse<ModelView[]>> {
    return this.safe(async () => {
      const config = await this.configFile.readConfig();
      return apiOk(config.models.map(toView), 'Models loaded');
    });
  }

  async findOne(id: string): Promise<ApiResponse<ModelView | null>> {
    if (!isValidId(id)) {
      return apiBadRequest(MODEL_CODES.BAD_REQUEST, 'Invalid model id');
    }
    return this.safe(async () => {
      const config = await this.configFile.readConfig();
      const model = findModel(config.models, id);
      if (!model) return apiFail(MODEL_CODES.NOT_FOUND, 'Model not found');
      return apiOk(toView(model), 'Model loaded');
    });
  }

  async create(payload: ModelPayload): Promise<ApiResponse<ModelView | null>> {
    const normalized = normalizePayload(payload);
    if (!normalized) {
      return apiBadRequest(MODEL_CODES.BAD_REQUEST, 'Invalid model payload');
    }

    return this.safe(async () => {
      const config = await this.configFile.readConfig();
      if (findModel(config.models, normalized.id)) {
        return apiFail(MODEL_CODES.ALREADY_EXISTS, 'Model already exists');
      }

      config.models.push(normalized);
      await this.configFile.writeConfig(config);
      return apiOk(toView(normalized), 'Model created');
    });
  }

  async update(
    id: string,
    payload: ModelPayload,
  ): Promise<ApiResponse<ModelView | null>> {
    if (!isValidId(id) || payload.id !== id) {
      return apiBadRequest(MODEL_CODES.BAD_REQUEST, 'Model id cannot be changed');
    }

    return this.safe(async () => {
      const config = await this.configFile.readConfig();
      const index = findModelIndex(config.models, id);
      if (index === -1) {
        return apiFail(MODEL_CODES.NOT_FOUND, 'Model not found');
      }

      const normalized = normalizePayload(payload, config.models[index]);
      if (!normalized) {
        return apiBadRequest(MODEL_CODES.BAD_REQUEST, 'Invalid model payload');
      }

      config.models[index] = normalized;
      await this.configFile.writeConfig(config);
      return apiOk(toView(normalized), 'Model updated');
    });
  }

  async remove(id: string): Promise<ApiResponse<{ id: string } | null>> {
    if (!isValidId(id)) {
      return apiBadRequest(MODEL_CODES.BAD_REQUEST, 'Invalid model id');
    }
    return this.safe(async () => {
      const config = await this.configFile.readConfig();
      const index = findModelIndex(config.models, id);
      if (index === -1) {
        return apiFail(MODEL_CODES.NOT_FOUND, 'Model not found');
      }

      config.models.splice(index, 1);
      await this.configFile.writeConfig(config);
      return apiOk({ id }, 'Model deleted');
    });
  }

  async test(
    id: string,
    payload: ModelTestPayload,
  ): Promise<ApiResponse<ModelTestResult | null>> {
    if (!isValidId(id)) {
      return apiBadRequest(MODEL_CODES.BAD_REQUEST, 'Invalid model id');
    }
    const mode = payload.mode;
    if (mode !== 'text' && mode !== 'image') {
      return apiFail(
        MODEL_CODES.UNSUPPORTED_TEST_MODE,
        'Unsupported test mode',
      );
    }

    return this.safe(async () => {
      const config = await this.configFile.readConfig();
      const model = findModel(config.models, id);
      if (!model) return apiFail(MODEL_CODES.NOT_FOUND, 'Model not found');

      const startedAt = Date.now();
      try {
        const adapter = getModelTestAdapter(model.provider);
        const result =
          mode === 'text'
            ? await adapter.testText(model)
            : await adapter.testImage(model);
        if (!result.ok) {
          return apiFail(MODEL_CODES.TEST_FAILED, result.message);
        }

        return apiOk(
          {
            id,
            provider: model.provider,
            mode,
            ok: true,
            durationMs: Date.now() - startedAt,
            message: result.message,
          },
          result.message,
        );
      } catch {
        return apiFail(
          MODEL_CODES.TEST_FAILED,
          'Model test failed: request failed',
        );
      }
    });
  }

  private async safe<T>(
    action: () => Promise<ApiResponse<T>>,
  ): Promise<ApiResponse<T>> {
    try {
      return await action();
    } catch {
      return apiFail(
        MODEL_CODES.CONFIG_IO_ERROR,
        'Config file read/write failed',
      );
    }
  }
}

function normalizePayload(
  payload: ModelPayload,
  existing?: ModelConfig,
): ModelConfig | null {
  if (!isValidId(payload.id)) return null;
  if (!isProvider(payload.provider)) return null;
  if (typeof payload.modelId !== 'string' || !payload.modelId.trim()) return null;
  if (typeof payload.baseUrl !== 'string') return null;
  const baseUrl = normalizeUrl(payload.baseUrl);
  if (!baseUrl) return null;
  if (typeof payload.enabled !== 'boolean') return null;
  const input = normalizeInput(payload.input);
  if (!input) return null;
  if (payload.apiKey !== undefined && typeof payload.apiKey !== 'string') {
    return null;
  }
  const apiKey = payload.apiKey?.trim() || existing?.apiKey;

  return {
    id: payload.id,
    provider: payload.provider,
    modelId: payload.modelId.trim(),
    enabled: payload.enabled,
    baseUrl,
    ...(apiKey ? { apiKey } : {}),
    input,
  };
}

function findModel(models: ModelConfig[], id: string): ModelConfig | undefined {
  return models.find((model) => model.id === id);
}

function findModelIndex(models: ModelConfig[], id: string): number {
  return models.findIndex((model) => model.id === id);
}

function toView(model: ModelConfig): ModelView {
  return {
    id: model.id,
    provider: model.provider,
    modelId: model.modelId,
    enabled: model.enabled,
    baseUrl: model.baseUrl,
    input: model.input,
    hasApiKey: Boolean(model.apiKey),
    maskedApiKey: maskApiKey(model.apiKey),
  };
}

function maskApiKey(apiKey?: string): string {
  if (!apiKey) return '';
  if (apiKey.length <= 8) return '*'.repeat(apiKey.length);
  return `${apiKey.slice(0, 4)}********${apiKey.slice(-4)}`;
}

function normalizeInput(value: unknown): ModelInput[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((item) => typeof item === 'string')) return null;
  const input = Array.from(
    new Set(value.map((item) => item.trim()).filter(Boolean)),
  );
  if (!input.every(isModelInput)) return null;
  return input;
}

function normalizeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return value.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

function isValidId(id: unknown): id is string {
  return typeof id === 'string' && VALID_ID.test(id);
}

function isProvider(value: unknown): value is ModelProvider {
  return MODEL_PROVIDERS.includes(value as ModelProvider);
}

function isModelInput(value: string): value is ModelInput {
  return MODEL_INPUTS.includes(value as ModelInput);
}
