import { forbidden, notFound } from '../../../shared/errors/applicationError';
import { MODEL_JOB_STATUS } from '../../model-jobs/domain/modelJobRepository';
import type { ModelsServices, UserModelServices } from './ports';
import { toModelListItemDto } from './modelLibraryDto';

export async function getCatalogModelById(services: ModelsServices, modelId: string, currentUserId?: string) {
  const model = await services.models.findById(modelId);
  if (!model) throw notFound('Model not found', 'model_not_found');

  const owner = await services.users.findById(model.ownerId);

  return toModelListItemDto({
    model,
    ownerNickname: owner?.nickname ?? 'Unknown user',
    currentUserId,
  });
}

export async function getUserModelById(services: UserModelServices, modelId: string, ownerId: string) {
  const model = await services.models.findById(modelId);
  if (!model) throw notFound('Model not found', 'model_not_found');
  if (model.ownerId !== ownerId) throw forbidden('You do not have access to this model', 'model_forbidden');

  const owner = await services.users.findById(model.ownerId);
  const sourceJob = model.sourceJobId ? await services.modelJobs.findById(model.sourceJobId) : null;

  return toModelListItemDto({
    model,
    ownerNickname: owner?.nickname ?? 'Unknown user',
    hasBeenRerun: sourceJob?.hasBeenRerun ?? false,
  });
}
