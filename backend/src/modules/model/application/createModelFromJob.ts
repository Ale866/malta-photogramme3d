import type { ModelsServices } from './ports';
import type { CreateModelInput, Model } from '../domain/modelRepository';
import { badRequest } from '../../../shared/errors/applicationError';

export async function createModelFromJob(services: Pick<ModelsServices, 'models'>, input: CreateModelInput): Promise<Model> {
  const ownerId = typeof input.ownerId === 'string' ? input.ownerId.trim() : '';
  if (!ownerId) throw badRequest('Missing ownerId', 'owner_id_required');

  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title) throw badRequest('Title is required', 'title_required');

  const outputFolder = typeof input.outputFolder === 'string' ? input.outputFolder.trim() : '';
  if (!outputFolder) throw badRequest('outputFolder is required', 'output_folder_required');

  const sourceJobId = input.sourceJobId ?? null;

  const model = await services.models.create({
    ownerId,
    title,
    outputFolder,
    sourceJobId,
    coordinates: input.coordinates,
  });

  return model;
}
