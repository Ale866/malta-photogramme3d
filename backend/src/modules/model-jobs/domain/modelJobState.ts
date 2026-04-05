import { MODEL_JOB_STATUS, type ModelJobStatus } from "./modelJobRepository";

export const MODEL_JOB_STATUSES: readonly ModelJobStatus[] = [
  MODEL_JOB_STATUS.QUEUED,
  MODEL_JOB_STATUS.QUEUED_TO_RERUN,
  MODEL_JOB_STATUS.FEATURE_EXTRACTION,
  MODEL_JOB_STATUS.FEATURE_MATCHING,
  MODEL_JOB_STATUS.SPARSE_MAPPING,
  MODEL_JOB_STATUS.DENSE_PREPARATION,
  MODEL_JOB_STATUS.DENSE_STEREO,
  MODEL_JOB_STATUS.FUSION,
  MODEL_JOB_STATUS.MESHING,
  MODEL_JOB_STATUS.TEXTURING,
  MODEL_JOB_STATUS.COMPLETED,
  MODEL_JOB_STATUS.FAILED,
] as const;

export function normalizeModelJobStatus(status: string): ModelJobStatus {
  if (MODEL_JOB_STATUSES.includes(status as ModelJobStatus)) {
    return status as ModelJobStatus;
  }
  throw new Error(`Unknown model job status: ${status}`);
}
