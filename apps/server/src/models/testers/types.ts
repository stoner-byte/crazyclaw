import type { ModelConfig } from '../models.types';

export type ModelTestProbe = {
  ok: boolean;
  message: string;
};

export interface ModelTestAdapter {
  testText(model: ModelConfig): Promise<ModelTestProbe>;
  testImage(model: ModelConfig): Promise<ModelTestProbe>;
}
