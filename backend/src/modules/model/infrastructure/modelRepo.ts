import type { Model as DomainModel, ModelRepository, CreateModelInput } from '../domain/modelRepository';
import { ModelSchema } from './db/ModelSchema';

function toDomain(doc: any): DomainModel {
  return {
    id: doc._id.toString(),
    ownerId: doc.ownerId,
    title: doc.title,
    sourceJobId: doc.sourceJobId ?? null,
    outputFolder: doc.outputFolder,
    createdAt: doc.createdAt,
  };
}

export const modelRepo: ModelRepository = {
  async create(input: CreateModelInput): Promise<DomainModel> {
    const created = await ModelSchema.create({
      ownerId: input.ownerId,
      title: input.title,
      sourceJobId: input.sourceJobId ?? undefined,
      outputFolder: input.outputFolder,
    });

    return toDomain(created);
  },

  async findById(id: string): Promise<DomainModel | null> {
    const doc = await ModelSchema.findById(id).lean();
    if (!doc) return null;

    return {
      id: doc._id.toString(),
      ownerId: doc.ownerId,
      title: doc.title,
      sourceJobId: doc.sourceJobId ?? null,
      outputFolder: doc.outputFolder,
      createdAt: doc.createdAt,
    };
  },

  async listByOwner(ownerId: string): Promise<DomainModel[]> {
    const docs = await ModelSchema.find({ ownerId }).sort({ createdAt: -1 }).lean();
    return docs.map((d) => ({
      id: d._id.toString(),
      ownerId: d.ownerId,
      title: d.title,
      sourceJobId: d.sourceJobId ?? null,
      outputFolder: d.outputFolder,
      createdAt: d.createdAt,
    }));
  },
};