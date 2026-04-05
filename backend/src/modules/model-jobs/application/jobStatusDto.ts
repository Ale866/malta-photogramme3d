import type { ModelJob, ModelJobStatus } from "../domain/modelJobRepository";

export type ModelJobStatusDto = {
  jobId: string;
  status: ModelJobStatus;
  stage: string;
  error?: string;
  modelId?: string;
  hasBeenRerun?: boolean;
  startedAt?: Date;
  finishedAt?: Date;
};

export function toModelJobStatusDto(job: ModelJob): ModelJobStatusDto {
  return {
    jobId: job.id,
    status: job.status,
    stage: job.stage,
    ...(job.error ? { error: job.error } : {}),
    ...(job.modelId ? { modelId: job.modelId } : {}),
    ...(job.hasBeenRerun ? { hasBeenRerun: true } : {}),
    ...(job.startedAt ? { startedAt: job.startedAt } : {}),
    ...(job.finishedAt ? { finishedAt: job.finishedAt } : {}),
  };
}
