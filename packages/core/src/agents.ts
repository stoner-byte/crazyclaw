import { initChatModel } from 'langchain';

export async function initStreamModel(modelConfig: any): Promise<any> {
  const modelId = modelConfig.modelId;
  const modelProvider = modelConfig.provider;
  const modelBaseUrl = modelConfig.baseUrl;
  const modelApiKey = modelConfig.apiKey;

  return initChatModel(modelId, {
    modelProvider: modelProvider,
    configuration: {
      baseURL: modelBaseUrl,
      apiKey: modelApiKey,
    },
    stream: true,
  });
}
