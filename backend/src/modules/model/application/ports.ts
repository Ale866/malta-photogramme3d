import type { ModelRepository } from '../domain/modelRepository';
import type { ModelJobRepository } from '../../model-jobs/domain/modelJobRepository';

export type ModelsServices = {
  models: ModelRepository;
};

export type ModelLibraryServices = {
  models: ModelRepository;
  modelJobs: ModelJobRepository;
};
