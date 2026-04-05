export const MODEL_JOB_STATUS = {
  QUEUED: "queued",
  QUEUED_TO_RERUN: "queued_to_rerun",
  FEATURE_EXTRACTION: "feature_extraction",
  FEATURE_MATCHING: "feature_matching",
  SPARSE_MAPPING: "sparse_mapping",
  DENSE_PREPARATION: "dense_preparation",
  DENSE_STEREO: "dense_stereo",
  FUSION: "fusion",
  MESHING: "meshing",
  TEXTURING: "texturing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type ModelJobStatus = (typeof MODEL_JOB_STATUS)[keyof typeof MODEL_JOB_STATUS];

export type ModelJobSnapshot = {
  jobId: string;
  status: ModelJobStatus;
  stage: string;
  error?: string;
  modelId?: string;
  hasBeenRerun?: boolean;
  startedAt?: string;
  finishedAt?: string;
};

export function isModelJobTerminalStatus(status: ModelJobStatus): boolean {
  return status === MODEL_JOB_STATUS.COMPLETED || status === MODEL_JOB_STATUS.FAILED
}

export function isModelJobPendingStatus(status: ModelJobStatus): boolean {
  return !isModelJobTerminalStatus(status)
}
