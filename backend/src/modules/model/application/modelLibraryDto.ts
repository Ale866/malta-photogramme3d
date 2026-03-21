import type { ModelJob } from '../../model-jobs/domain/modelJobRepository';
import type { Model } from '../domain/modelRepository';

export type ModelListItemDto = {
  id: string;
  ownerId: string;
  ownerNickname: string;
  title: string;
  sourceJobId: string | null;
  outputFolder: string;
  createdAt: Date;
  coordinates: { x: number; y: number; z: number };
  voteCount: number;
  hasVoted: boolean;
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
  ownerNicknames: ReadonlyMap<string, string>;
}): UserModelLibraryDto {
  return {
    models: input.models.map((model) => ({
      id: model.id,
      ownerId: model.ownerId,
      ownerNickname: input.ownerNicknames.get(model.ownerId) ?? 'Unknown user',
      title: model.title,
      sourceJobId: model.sourceJobId,
      outputFolder: model.outputFolder,
      createdAt: model.createdAt,
      coordinates: model.coordinates,
      voteCount: model.userVotesIds.length,
      hasVoted: false,
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

export function toModelCatalogDto(input: {
  models: Model[];
  ownerNicknames: ReadonlyMap<string, string>;
  currentUserId?: string;
}): ModelListItemDto[] {
  return input.models.map((model) => ({
    id: model.id,
    ownerId: model.ownerId,
    ownerNickname: input.ownerNicknames.get(model.ownerId) ?? 'Unknown user',
    title: model.title,
    sourceJobId: model.sourceJobId,
    outputFolder: model.outputFolder,
    createdAt: model.createdAt,
    coordinates: model.coordinates,
    voteCount: model.userVotesIds.length,
    hasVoted: typeof input.currentUserId === 'string' && input.currentUserId.length > 0
      ? model.userVotesIds.includes(input.currentUserId)
      : false,
  }));
}
