import type { ModelJobStatus } from './ModelJob';
import type { ModelSummary } from './ModelSummary';

export type NonCompletedModelJobSummary = {
  id: string;
  title: string;
  status: ModelJobStatus;
  stage: string;
  progress: number;
  error: string | null;
  coordinates: { x: number; y: number; z: number } | null;
  createdAt: string;
  updatedAt: string;
};

export type ModelLibrary = {
  models: ModelSummary[];
  modelJobs: NonCompletedModelJobSummary[];
};
