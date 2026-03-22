import type { Model, ModelRepository, CreateModelInput } from '../domain/modelRepository';
import { MIN_ISLAND_MODEL_VOTES } from '../domain/islandVisibility';
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
    userVotesIds: doc.userVotesIds || []
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
      userVotesIds: [],
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

  async listCatalog(): Promise<Model[]> {
    const docs = await ModelSchema.find().sort({ createdAt: -1 }).lean();
    return docs.map(toDomain);
  },

  async listIslandCatalog(): Promise<Model[]> {
    const requiredVoteIndex = MIN_ISLAND_MODEL_VOTES - 1;
    const docs = await ModelSchema.find({
      [`userVotesIds.${requiredVoteIndex}`]: { $exists: true },
    }).sort({ createdAt: -1 }).lean();
    return docs.map(toDomain);
  },

  async vote(modelId: string, userId: string) {
    const result = await ModelSchema.updateOne({ _id: modelId }, { $addToSet: { userVotesIds: userId } });
    return { changed: result.modifiedCount > 0 };
  },

  async unvote(modelId: string, userId: string) {
    const result = await ModelSchema.updateOne({ _id: modelId }, { $pull: { userVotesIds: userId } });
    return { changed: result.modifiedCount > 0 };
  }
};
