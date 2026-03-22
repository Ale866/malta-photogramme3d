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
  coordinates: { x: number; y: number; z: number } | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UserModelLibraryDto = {
  models: ModelListItemDto[];
  modelJobs: ModelJobListItemDto[];
};

export function toModelListItemDto(input: {
  model: Model;
  ownerNickname: string;
  currentUserId?: string;
}): ModelListItemDto {
  return {
    id: input.model.id,
    ownerId: input.model.ownerId,
    ownerNickname: input.ownerNickname,
    title: input.model.title,
    sourceJobId: input.model.sourceJobId,
    outputFolder: input.model.outputFolder,
    createdAt: input.model.createdAt,
    coordinates: input.model.coordinates,
    voteCount: input.model.userVotesIds.length,
    hasVoted: typeof input.currentUserId === 'string' && input.currentUserId.length > 0
      ? input.model.userVotesIds.includes(input.currentUserId)
      : false,
  };
}

export function toUserModelLibraryDto(input: {
  models: Model[];
  modelJobs: ModelJob[];
  ownerNicknames: ReadonlyMap<string, string>;
}): UserModelLibraryDto {
  return {
    models: input.models.map((model) =>
      toModelListItemDto({
        model,
        ownerNickname: input.ownerNicknames.get(model.ownerId) ?? 'Unknown user',
      })
    ),
    modelJobs: input.modelJobs.map((job) => ({
      id: job.id,
      title: job.title,
      status: job.status,
      stage: job.stage,
      progress: job.progress,
      error: job.error,
      coordinates: job.coordinates,
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
  return input.models.map((model) =>
    toModelListItemDto({
      model,
      ownerNickname: input.ownerNicknames.get(model.ownerId) ?? 'Unknown user',
      currentUserId: input.currentUserId,
    })
  );
}
