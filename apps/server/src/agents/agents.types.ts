export type AgentConfig = {
  id: string;
  description: string;
  enabled: boolean;
  workspaces: string[];
  tools: string[];
};

export type AgentView = AgentConfig & {
  systemPrompt: string;
};

export type AgentPayload = {
  id: string;
  description?: string;
  enabled?: boolean;
  workspaces?: string[];
  tools?: unknown[];
  systemPrompt?: string;
};

export type CrazyclawConfig = {
  agents: Record<string, AgentConfig>;
};

export const AGENT_CODES = {
  OK: 0,
  NOT_FOUND: 1001,
  ALREADY_EXISTS: 1002,
  BAD_REQUEST: 1003,
  DEFAULT_WORKSPACE_LOCKED: 1004,
  CONFIG_IO_ERROR: 1005,
} as const;
