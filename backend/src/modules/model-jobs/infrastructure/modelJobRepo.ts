import type {
  ModelJobRepository,
  CreateModelJobInput,
  ModelJob,
  UpdateModelJobStateInput,
} from '../domain/modelJobRepository';
import { clampProgress } from '../domain/modelJobState';
import { ModelJobSchema } from './db/ModelJobSchema';
import { toModelJobDomain } from './modelJobMapper';

export const modelJobRepo: ModelJobRepository = {
  async create(input: CreateModelJobInput): Promise<ModelJob> {
    const created = await ModelJobSchema.create({
      ownerId: input.ownerId,
      title: input.title,
      status: input.status ?? 'queued',
      inputFolder: input.inputFolder ?? '',
      outputFolder: input.outputFolder ?? '',
      imagePaths: input.imagePaths ?? [],
      coordinates: input.coordinates ?? null,
      stage: input.stage ?? 'starting',
      progress: clampProgress(input.progress ?? 0),
      logTail: input.logTail ?? [],
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
      { status: 'queued' },
      {
        $set: {
          status: 'running',
          stage: 'starting',
          progress: 1,
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
    if (Array.isArray(patch.logTail)) update.logTail = patch.logTail;
    if (typeof patch.error === 'string' || patch.error === null) update.error = patch.error;
    if (typeof patch.modelId === 'string' || patch.modelId === null) update.modelId = patch.modelId;
    if (patch.startedAt instanceof Date || patch.startedAt === null) update.startedAt = patch.startedAt;
    if (patch.finishedAt instanceof Date || patch.finishedAt === null) update.finishedAt = patch.finishedAt;
    if (typeof patch.outputFolder === 'string') update.outputFolder = patch.outputFolder;

    if (Object.keys(update).length === 0) {
      return this.findById(jobId);
    }

    const doc = await ModelJobSchema.findByIdAndUpdate(jobId, { $set: update }, { returnDocument: 'after' }).lean();
    if (!doc) return null;

    return toModelJobDomain(doc);
  },

  async listNonCompletedByOwner(ownerId: string): Promise<ModelJob[]> {
    const docs = await ModelJobSchema.find({
      ownerId,
      status: { $in: ['queued', 'running', 'failed'] },
    }).sort({ createdAt: -1 }).lean();
    return docs.map((doc) => toModelJobDomain(doc));
  }
};
