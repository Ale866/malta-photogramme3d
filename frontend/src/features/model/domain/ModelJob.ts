export type ModelJobStatus = "queued" | "running" | "succeeded" | "failed";

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
