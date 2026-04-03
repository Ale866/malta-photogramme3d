import type {
  ModelJobRepository,
  CreateModelJobInput,
  ModelJob,
  UpdateModelJobStateInput,
} from '../domain/modelJobRepository';
import { MODEL_JOB_STATUS } from '../domain/modelJobRepository';
import { clampProgress } from '../domain/modelJobState';
import { ModelJobSchema } from './db/ModelJobSchema';
import { toModelJobDomain } from './modelJobMapper';

export const modelJobRepo: ModelJobRepository = {
  async create(input: CreateModelJobInput): Promise<ModelJob> {
    const created = await ModelJobSchema.create({
      ownerId: input.ownerId,
      title: input.title,
      status: input.status ?? MODEL_JOB_STATUS.QUEUED,
      inputFolder: input.inputFolder ?? '',
      outputFolder: input.outputFolder ?? '',
      imagePaths: input.imagePaths ?? [],
      coordinates: input.coordinates ?? null,
      stage: input.stage ?? MODEL_JOB_STATUS.QUEUED,
      progress: clampProgress(input.progress ?? 0),
      error: input.error ?? null,
      modelId: input.modelId ?? null,
      startedAt: input.startedAt ?? null,
      finishedAt: input.finishedAt ?? null,
    });

    return toModelJobDomain(created);
  },

  async findById(id: string): Promise<ModelJob | null> {
    const doc = await ModelJobSchema.findById(id).lean();
    if (!doc) return null;

    return toModelJobDomain(doc);
  },

  async claimNextQueued(): Promise<ModelJob | null> {
    const startedAt = new Date();
    const doc = await ModelJobSchema.findOneAndUpdate(
      { status: MODEL_JOB_STATUS.QUEUED },
      {
        $set: {
          status: MODEL_JOB_STATUS.QUEUED,
          stage: MODEL_JOB_STATUS.QUEUED,
          progress: 0,
          error: null,
          startedAt,
        },
      },
      {
        sort: { createdAt: 1, _id: 1 },
        returnDocument: 'after',
      }
    ).lean();

    if (!doc) return null;
    return toModelJobDomain(doc);
  },

  async updateState(jobId: string, patch: UpdateModelJobStateInput): Promise<ModelJob | null> {
    const update: Record<string, unknown> = {};

    if (typeof patch.status === 'string') update.status = patch.status;
    if (typeof patch.stage === 'string') update.stage = patch.stage;
    if (typeof patch.progress === 'number') update.progress = clampProgress(patch.progress);
    if (typeof patch.error === 'string' || patch.error === null) update.error = patch.error;
    if (typeof patch.modelId === 'string' || patch.modelId === null) update.modelId = patch.modelId;
    if (patch.startedAt instanceof Date || patch.startedAt === null) update.startedAt = patch.startedAt;
    if (patch.finishedAt instanceof Date || patch.finishedAt === null) update.finishedAt = patch.finishedAt;
    if (typeof patch.outputFolder === 'string') update.outputFolder = patch.outputFolder;

    if (Object.keys(update).length === 0) {
      return this.findById(jobId);
    }

    const doc = await ModelJobSchema.findByIdAndUpdate(
      jobId,
      {
        $set: update,
      },
      { returnDocument: 'after' }
    ).lean();
    if (!doc) return null;

    return toModelJobDomain(doc);
  },

  async listNonCompletedByOwner(ownerId: string): Promise<ModelJob[]> {
    const docs = await ModelJobSchema.find({
      ownerId,
      status: { $ne: MODEL_JOB_STATUS.COMPLETED },
    }).sort({ createdAt: -1 }).lean();
    return docs.map((doc) => toModelJobDomain(doc));
  },

  async deleteById(jobId: string) {
    const result = await ModelJobSchema.deleteOne({ _id: jobId });
    return result.deletedCount > 0;
  }
};
