import type { ModelJob } from "../domain/modelJobRepository";

export type ModelJobDetailsDto = {
  jobId: string;
  title: string;
  status: ModelJob["status"];
  stage: string;
  error: string | null;
  modelId: string | null;
  hasBeenRerun: boolean;
  coordinates: { x: number; y: number; z: number } | null;
  imageCount: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
};

export function toModelJobDetailsDto(job: ModelJob): ModelJobDetailsDto {
  return {
    jobId: job.id,
    title: job.title,
    status: job.status,
    stage: job.stage,
    error: job.error,
    modelId: job.modelId,
    hasBeenRerun: job.hasBeenRerun,
    coordinates: job.coordinates,
    imageCount: job.imagePaths.length,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
  };
}
