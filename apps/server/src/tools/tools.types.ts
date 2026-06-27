export type ToolConfig = {
  name: string;
  description: string;
  builtIn: boolean;
  enabled: boolean;
};

export type ToolView = ToolConfig;

export type ToolPayload = {
  name?: unknown;
  description?: unknown;
  builtIn?: unknown;
  enabled?: unknown;
};

export const TOOL_CODES = {
  OK: 0,
  NOT_FOUND: 1201,
  ALREADY_EXISTS: 1202,
  BAD_REQUEST: 1203,
  BUILT_IN_LOCKED: 1204,
  CONFIG_IO_ERROR: 1205,
} as const;
