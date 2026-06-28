import { readConfig } from './readConfig.js';
import { initStreamModel } from './agents.js';

export async function createAgent(
  agentName: string,
  modelName: string,
) {
  const config = readConfig(agentName, modelName);
  return await initStreamModel(config?.modelConfig)

  // const response = await model.stream('你好，你是谁？');

  // let thinking = true;
  // console.log('思考中...');
  // for await (const chunk of response) {
  //   // console.log(chunk);
  //   if (thinking) {
  //     if (chunk.additional_kwargs.reasoning_content) {
  //       process.stdout.write(chunk.additional_kwargs.reasoning_content);
  //     } else {
  //       console.log();
  //       thinking = false;
  //     }
  //   }
  //   if (!thinking) {
  //     process.stdout.write(chunk.content);
  //   }
  // }
}
