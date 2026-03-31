import type { ModelRepository } from '../domain/modelRepository';
import type { ModelJobRepository } from '../../model-jobs/domain/modelJobRepository';
import type { UserRepository } from '../../auth/domain/userRepository';

export type ModelsServices = {
  models: ModelRepository;
  users: UserRepository;
};

export type ModelLibraryServices = {
  models: ModelRepository;
  modelJobs: ModelJobRepository;
  users: UserRepository;
};

export type ModelDeletionServices = {
  models: ModelRepository;
  modelJobs: ModelJobRepository;
  deleteDirectory: (directoryPath: string) => void;
};
