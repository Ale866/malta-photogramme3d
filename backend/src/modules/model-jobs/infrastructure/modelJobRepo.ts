import type {
  ModelJobRepository,
  CreateModelJobInput,
  ModelJob,
  UpdateModelJobStateInput,
} from '../domain/modelJobRepository';
import { clampProgress, normalizeModelJobStatus } from '../domain/modelJobState';
import { ModelJobSchema } from './db/ModelJobSchema';

function toDomain(doc: any): ModelJob {
  return {
    id: doc._id.toString(),
    ownerId: doc.ownerId,
    title: doc.title,
    inputFolder: doc.inputFolder ?? '',
    outputFolder: doc.outputFolder ?? '',
    imagePaths: doc.imagePaths ?? [],
    status: normalizeModelJobStatus(doc.status),
    stage: doc.stage ?? 'starting',
    progress: clampProgress(doc.progress ?? 0),
    logTail: Array.isArray(doc.logTail) ? doc.logTail : [],
    error: doc.error ?? null,
    modelId: doc.modelId ?? null,
    startedAt: doc.startedAt ?? null,
    finishedAt: doc.finishedAt ?? null,
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
      stage: input.stage ?? 'starting',
      progress: clampProgress(input.progress ?? 0),
      logTail: input.logTail ?? [],
      error: input.error ?? null,
      modelId: input.modelId ?? null,
      startedAt: input.startedAt ?? null,
      finishedAt: input.finishedAt ?? null,
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
      status: normalizeModelJobStatus(doc.status),
      stage: doc.stage ?? 'starting',
      progress: clampProgress(doc.progress ?? 0),
      logTail: Array.isArray(doc.logTail) ? doc.logTail : [],
      error: doc.error ?? null,
      modelId: doc.modelId ?? null,
      startedAt: doc.startedAt ?? null,
      finishedAt: doc.finishedAt ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  },

  async updateState(jobId: string, patch: UpdateModelJobStateInput): Promise<ModelJob | null> {
    const update: Record<string, unknown> = {};

    if (typeof patch.status === 'string') update.status = patch.status;
    if (typeof patch.stage === 'string') update.stage = patch.stage;
    if (typeof patch.progress === 'number') update.progress = clampProgress(patch.progress);
    if (Array.isArray(patch.logTail)) update.logTail = patch.logTail;
    if (typeof patch.error === 'string' || patch.error === null) update.error = patch.error;
    if (typeof patch.modelId === 'string' || patch.modelId === null) update.modelId = patch.modelId;
    if (patch.startedAt instanceof Date || patch.startedAt === null) update.startedAt = patch.startedAt;
    if (patch.finishedAt instanceof Date || patch.finishedAt === null) update.finishedAt = patch.finishedAt;
    if (typeof patch.outputFolder === 'string') update.outputFolder = patch.outputFolder;

    if (Object.keys(update).length === 0) {
      return this.findById(jobId);
    }

    const doc = await ModelJobSchema.findByIdAndUpdate(jobId, { $set: update }, { new: true }).lean();
    if (!doc) return null;

    return toDomain(doc);
  },
};
