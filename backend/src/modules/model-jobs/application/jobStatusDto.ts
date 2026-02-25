import type { ModelJob, ModelJobStatus } from "../domain/modelJobRepository";

export type ModelJobStatusDto = {
  jobId: string;
  status: ModelJobStatus;
  stage: string;
  progress: number;
  error?: string;
  modelId?: string;
  startedAt?: Date;
  finishedAt?: Date;
};

export function toModelJobStatusDto(job: ModelJob): ModelJobStatusDto {
  return {
    jobId: job.id,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    ...(job.error ? { error: job.error } : {}),
    ...(job.modelId ? { modelId: job.modelId } : {}),
    ...(job.startedAt ? { startedAt: job.startedAt } : {}),
    ...(job.finishedAt ? { finishedAt: job.finishedAt } : {}),
  };
}
