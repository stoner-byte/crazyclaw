import { readConfig } from './readConfig.js';

export async function createAgent(
  agentName: string,
  modelName: string,
) {
  const config = readConfig(agentName, modelName);
  console.log(config);
}

createAgent('coder', 'qwen');
