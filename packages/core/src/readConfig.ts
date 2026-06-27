import { existsSync, readFileSync } from 'node:fs';
import * as os from 'node:os';
import { join } from 'node:path';

const CONFIG_FILE = 'crazyclaw.json';
const PROMPT_FILE = 'CRAZY.md';

export function readConfig(agentName: string, modelName: string) {
  const normalizedAgentName = agentName.trim();
  if (!normalizedAgentName) {
    throw new Error('Agent id must not be empty');
  }
  const normalizedModelName = modelName.trim();
  if (!normalizedModelName) {
    throw new Error('Model id must not be empty');
  }

  const rootDir = join(process.env.HOME ?? os.homedir(), '.crazyclaw');
  const configPath = join(rootDir, CONFIG_FILE);

  try {
    const rootConfig = JSON.parse(readFileSync(configPath, 'utf8')) as unknown;
    if (!isRecord(rootConfig)) return null;

    const agents = Array.isArray(rootConfig.agents) ? rootConfig.agents : [];
    const models = Array.isArray(rootConfig.models) ? rootConfig.models : [];
    const agent = agents.find((item) => item.id === normalizedAgentName);
    if (!agent) return null;
    const modelConfig = models.find((item) => item.id === normalizedModelName);
    if (!modelConfig) return null;

    return {
      agentName: normalizedAgentName,
      agentConfig: {
        ...agent,
        systemPrompt: readAgentPrompt(rootDir, agent),
      },
      modelName: normalizedModelName,
      modelConfig,
    };
  } catch {
    return null;
  }
}

function readAgentPrompt(rootDir: string, agent: any) {
  const promptPath = join(
    agent.workspaces[0] ?? join(rootDir, agent.id),
    PROMPT_FILE,
  );
  if (!existsSync(promptPath)) return '';
  return readFileSync(promptPath, 'utf8');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
