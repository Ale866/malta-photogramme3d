import type { ModelJobStatus } from './ModelJob';
import type { ModelSummary } from './ModelSummary';

export type IncompleteModelJobSummary = {
  id: string;
  title: string;
  status: ModelJobStatus;
  stage: string;
  progress: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ModelLibrary = {
  models: ModelSummary[];
  modelJobs: IncompleteModelJobSummary[];
};
