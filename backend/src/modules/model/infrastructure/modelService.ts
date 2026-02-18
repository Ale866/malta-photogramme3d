import type { ModelsServices } from '../application/ports';
import { modelRepo } from './modelRepo';

export const modelServices: ModelsServices = {
  models: modelRepo,
};