import type { ModelJobRepository, CreateModelJobInput, ModelJob } from '../domain/modelJobRepository';
import { ModelJobSchema } from './db/ModelJobSchema';

function toDomain(doc: any): ModelJob {
  return {
    id: doc._id.toString(),
    ownerId: doc.ownerId,
    title: doc.title,
    inputFolder: doc.inputFolder ?? '',
    outputFolder: doc.outputFolder ?? '',
    imagePaths: doc.imagePaths ?? [],
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const modelJobRepo: ModelJobRepository = {
  async create(input: CreateModelJobInput): Promise<ModelJob> {
    const created = await ModelJobSchema.create({
      ownerId: input.ownerId,
      title: input.title,
      status: input.status ?? 'queued',
      inputFolder: input.inputFolder ?? '',
      outputFolder: input.outputFolder ?? '',
      imagePaths: input.imagePaths ?? [],
    });

    return toDomain(created);
  },

  async findById(id: string): Promise<ModelJob | null> {
    const doc = await ModelJobSchema.findById(id).lean();
    if (!doc) return null;

    return {
      id: doc._id.toString(),
      ownerId: doc.ownerId,
      title: doc.title,
      inputFolder: doc.inputFolder ?? '',
      outputFolder: doc.outputFolder ?? '',
      imagePaths: doc.imagePaths ?? [],
      status: doc.status as ModelJob['status'],
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  },

  async setRunning(jobId: string) {
    await ModelJobSchema.findByIdAndUpdate(jobId, { status: 'running' }).exec();
  },

  async setDone(jobId: string, patch?: { outputFolder?: string }) {
    await ModelJobSchema.findByIdAndUpdate(jobId, { status: 'done', ...(patch ?? {}) }).exec();
  },

  async setFailed(jobId: string) {
    await ModelJobSchema.findByIdAndUpdate(jobId, { status: 'failed' }).exec();
  },
};
