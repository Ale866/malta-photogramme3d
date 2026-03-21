import type { NonCompletedModelJobSummary, ModelLibrary } from '@/features/model/domain/ModelLibrary';
import { getModelLifecycleStatus } from '@/features/model/domain/ModelSummary';
import type { ModelSummary } from '@/features/model/domain/ModelSummary';

export type ModelCardViewModel = {
  id: string;
  ownerId: string | null;
  type: 'model' | 'job';
  createdAt: string;
  title: string;
  modelPlaceholderLabel: string;
  locationCoordinates: { x: number; y: number; z: number } | null;
  date: string;
  voteCount: number,
  hasVoted: boolean,
  status: 'ready' | 'pending' | 'failed';
};

export function toModelCardViewModel(model: ModelSummary): ModelCardViewModel {
  const status = getModelLifecycleStatus(model);

  return {
    id: model.id,
    ownerId: model.ownerId,
    type: 'model',
    createdAt: model.createdAt,
    title: model.title,
    modelPlaceholderLabel: '3D preview placeholder',
    locationCoordinates: model.coordinates,
    date: model.createdAt,
    status,
    voteCount: model.voteCount,
    hasVoted: model.hasVoted,
  };
}

export function toModelCardViewModels(models: readonly ModelSummary[]): ModelCardViewModel[] {
  return models.map(toModelCardViewModel);
}

function toModelJobCardViewModel(job: NonCompletedModelJobSummary): ModelCardViewModel {
  const status = job.status === 'failed' ? 'failed' : 'pending';

  return {
    id: job.id,
    ownerId: null,
    type: 'job',
    createdAt: job.createdAt,
    title: job.title,
    modelPlaceholderLabel: 'Pipeline job',
    locationCoordinates: job.coordinates,
    date: job.createdAt,
    status,
    voteCount: 0,
    hasVoted: false,
  };
}

export function toModelLibraryCardViewModels(library: ModelLibrary | null): ModelCardViewModel[] {
  if (!library) return [];

  return [
    ...library.models.map(toModelCardViewModel),
    ...library.modelJobs.map(toModelJobCardViewModel),
  ].sort((model, modelJob) => {
    const modelTime = Date.parse(model.createdAt);
    const modelJobTime = Date.parse(modelJob.createdAt);
    if (Number.isNaN(modelTime) || Number.isNaN(modelJobTime)) return 0;
    return modelJobTime - modelTime;
  });
}
