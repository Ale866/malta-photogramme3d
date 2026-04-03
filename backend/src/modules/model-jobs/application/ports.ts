import type { ModelJobRepository } from '../domain/modelJobRepository';

export type ModelJobServices = {
  modelJobs: ModelJobRepository;
};

export type FailedModelJobDeletionServices = {
  modelJobs: ModelJobRepository;
  deleteDirectory: (directoryPath: string) => void;
};

export type FailedModelJobRerunServices = {
  modelJobs: ModelJobRepository;
  deleteDirectory: (directoryPath: string) => void;
};
