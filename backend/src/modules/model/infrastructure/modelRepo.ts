import type { Model, ModelRepository, CreateModelInput } from '../domain/modelRepository';
import { ModelSchema } from './db/ModelSchema';

function toDomain(doc: any): Model {
  return {
    id: doc._id.toString(),
    ownerId: doc.ownerId,
    title: doc.title,
    sourceJobId: doc.sourceJobId ?? null,
    outputFolder: doc.outputFolder,
    createdAt: doc.createdAt,
    coordinates: doc.coordinates,
  };
}

export const modelRepo: ModelRepository = {
  async create(input: CreateModelInput): Promise<Model> {
    const created = await ModelSchema.create({
      ownerId: input.ownerId,
      title: input.title,
      sourceJobId: input.sourceJobId ?? undefined,
      outputFolder: input.outputFolder,
      coordinates: input.coordinates,
    });

    return toDomain(created);
  },

  async findById(id: string): Promise<Model | null> {
    const doc = await ModelSchema.findById(id).lean();
    if (!doc) return null;
    return toDomain(doc);
  },

  async listByOwner(ownerId: string): Promise<Model[]> {
    const docs = await ModelSchema.find({ ownerId }).sort({ createdAt: -1 }).lean();
    return docs.map(toDomain);
  },

  async listAllPublic(): Promise<Model[]> {
    const docs = await ModelSchema.find().sort({ createdAt: -1 }).lean();
    return docs.map(toDomain);
  }
};