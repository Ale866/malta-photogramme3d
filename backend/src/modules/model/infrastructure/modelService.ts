import type { ModelLibraryServices, ModelsServices } from '../application/ports';
import { modelRepo } from './modelRepo';
import { modelJobRepo } from '../../model-jobs/infrastructure/modelJobRepo';

export const modelServices: ModelsServices = {
  models: modelRepo,
};

export const modelLibraryServices: ModelLibraryServices = {
  models: modelRepo,
  modelJobs: modelJobRepo,
};
