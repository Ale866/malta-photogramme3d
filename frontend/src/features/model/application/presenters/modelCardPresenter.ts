import type { IncompleteModelJobSummary, ModelLibrary } from '@/features/model/domain/ModelLibrary';
import { getModelLifecycleStatus } from '@/features/model/domain/ModelSummary';
import type { ModelSummary } from '@/features/model/domain/ModelSummary';

export type ModelCardViewModel = {
  id: string;
  type: 'model' | 'job';
  createdAt: string;
  title: string;
  modelPlaceholderLabel: string;
  coordinates: string;
  date: string;
  status: 'ready' | 'pending' | 'failed';
};

export function toModelCardViewModel(model: ModelSummary): ModelCardViewModel {
  const status = getModelLifecycleStatus(model);

  return {
    id: model.id,
    type: 'model',
    createdAt: model.createdAt,
    title: model.title,
    modelPlaceholderLabel: '3D preview placeholder',
    coordinates: `${model.coordinates.x}, ${model.coordinates.y}, ${model.coordinates.z}`,
    date: model.createdAt,
    status,
  };
}

export function toModelCardViewModels(models: readonly ModelSummary[]): ModelCardViewModel[] {
  return models.map(toModelCardViewModel);
}

function toModelJobCardViewModel(job: IncompleteModelJobSummary): ModelCardViewModel {
  const status = job.status === 'failed' ? 'failed' : 'pending';

  return {
    id: job.id,
    type: 'job',
    createdAt: job.createdAt,
    title: job.title,
    modelPlaceholderLabel: 'Pipeline job',
    coordinates: 'Not available until processing finishes',
    date: job.createdAt,
    status,
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
