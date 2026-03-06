import type { ModelJob } from '../../model-jobs/domain/modelJobRepository';
import type { Model } from '../domain/modelRepository';

export type ModelListItemDto = {
  id: string;
  title: string;
  sourceJobId: string | null;
  outputFolder: string;
  createdAt: Date;
  coordinates: { x: number; y: number; z: number };
};

export type ModelJobListItemDto = {
  id: string;
  title: string;
  status: ModelJob['status'];
  stage: string;
  progress: number;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UserModelLibraryDto = {
  models: ModelListItemDto[];
  modelJobs: ModelJobListItemDto[];
};

export function toUserModelLibraryDto(input: {
  models: Model[];
  modelJobs: ModelJob[];
}): UserModelLibraryDto {
  return {
    models: input.models.map((model) => ({
      id: model.id,
      title: model.title,
      sourceJobId: model.sourceJobId,
      outputFolder: model.outputFolder,
      createdAt: model.createdAt,
      coordinates: model.coordinates,
    })),
    modelJobs: input.modelJobs.map((job) => ({
      id: job.id,
      title: job.title,
      status: job.status,
      stage: job.stage,
      progress: job.progress,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    })),
  };
}
