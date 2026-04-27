import type {
  ModelJobRepository,
  CreateModelJobInput,
  ModelJob,
  ModelJobStatus,
  UpdateModelJobStateInput,
} from '../domain/modelJobRepository';
import { MODEL_JOB_STATUS } from '../domain/modelJobRepository';
import { MODEL_JOB_STATUSES } from '../domain/modelJobState';
import { ModelJobSchema } from './db/ModelJobSchema';
import { toModelJobDomain } from './modelJobMapper';

const NON_RESUMABLE_JOB_STATUSES = new Set<ModelJobStatus>([
  MODEL_JOB_STATUS.QUEUED,
  MODEL_JOB_STATUS.QUEUED_TO_RERUN,
  MODEL_JOB_STATUS.COMPLETED,
  MODEL_JOB_STATUS.FAILED,
]);

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
      error: input.error ?? null,
      modelId: input.modelId ?? null,
      hasBeenRerun: Boolean(input.hasBeenRerun),
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

  async claimNextProcessable(): Promise<ModelJob | null> {
    const claimJob = async (filter: Record<string, unknown>, sort: Record<string, 1 | -1>) => {
      const doc = await ModelJobSchema.findOneAndUpdate(
        filter,
        {
          $set: {
            error: null,
            modelId: null,
            finishedAt: null,
          },
        },
        {
          sort,
          returnDocument: 'after',
        }
      ).lean();

      return doc ? toModelJobDomain(doc) : null;
    };

    const resumableJob = await claimJob(
      {
        status: {
          $in: MODEL_JOB_STATUSES.filter((status) => !NON_RESUMABLE_JOB_STATUSES.has(status)),
        },
      },
      { startedAt: 1, createdAt: 1, _id: 1 }
    );
    if (resumableJob) return resumableJob;

    return claimJob(
      { status: { $in: [MODEL_JOB_STATUS.QUEUED, MODEL_JOB_STATUS.QUEUED_TO_RERUN] } },
      { createdAt: 1, _id: 1 }
    );
  },

  async updateState(jobId: string, patch: UpdateModelJobStateInput): Promise<ModelJob | null> {
    const update: Record<string, unknown> = {};

    if (typeof patch.status === 'string') update.status = patch.status;
    if (typeof patch.stage === 'string') update.stage = patch.stage;
    if (typeof patch.error === 'string' || patch.error === null) update.error = patch.error;
    if (typeof patch.modelId === 'string' || patch.modelId === null) update.modelId = patch.modelId;
    if (typeof patch.hasBeenRerun === 'boolean') update.hasBeenRerun = patch.hasBeenRerun;
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
