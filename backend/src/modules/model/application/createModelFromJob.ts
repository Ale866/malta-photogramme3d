import type { ModelsServices } from './ports';
import type { CreateModelInput, Model } from '../domain/modelRepository';

export async function createModelFromJob(services: ModelsServices, input: CreateModelInput): Promise<Model> {
  if (!input.ownerId) throw new Error('Missing ownerId');

  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title) throw new Error('Title is required');

  const outputFolder = typeof input.outputFolder === 'string' ? input.outputFolder.trim() : '';
  if (!outputFolder) throw new Error('outputFolder is required');

  const sourceJobId = input.sourceJobId ?? null;

  const model = await services.models.create({
    ownerId: input.ownerId,
    title,
    outputFolder,
    sourceJobId,
  });

  return model;
}