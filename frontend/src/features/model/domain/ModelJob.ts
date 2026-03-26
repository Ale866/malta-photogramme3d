export const MODEL_JOB_STATUS = {
  QUEUED: "queued",
  FEATURE_EXTRACTION_RUNNING: "feature_extraction_running",
  FEATURE_EXTRACTION_COMPLETED: "feature_extraction_completed",
  FEATURE_MATCHING_RUNNING: "feature_matching_running",
  FEATURE_MATCHING_COMPLETED: "feature_matching_completed",
  SPARSE_MAPPING_RUNNING: "sparse_mapping_running",
  SPARSE_MAPPING_COMPLETED: "sparse_mapping_completed",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type ModelJobStatus = (typeof MODEL_JOB_STATUS)[keyof typeof MODEL_JOB_STATUS];

export type ModelJobSnapshot = {
  jobId: string;
  status: ModelJobStatus;
  stage: string;
  progress: number;
  error?: string;
  modelId?: string;
  startedAt?: string;
  finishedAt?: string;
};

export function isModelJobTerminalStatus(status: ModelJobStatus): boolean {
  return status === MODEL_JOB_STATUS.COMPLETED || status === MODEL_JOB_STATUS.FAILED
}

export function isModelJobPendingStatus(status: ModelJobStatus): boolean {
  return !isModelJobTerminalStatus(status)
}
