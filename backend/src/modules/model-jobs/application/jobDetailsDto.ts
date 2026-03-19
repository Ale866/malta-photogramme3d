import type { ModelJob } from "../domain/modelJobRepository";

export type ModelJobDetailsDto = {
  jobId: string;
  title: string;
  status: ModelJob["status"];
  stage: string;
  progress: number;
  error: string | null;
  modelId: string | null;
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
    progress: job.progress,
    error: job.error,
    modelId: job.modelId,
    coordinates: job.coordinates,
    imageCount: job.imagePaths.length,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
  };
}
