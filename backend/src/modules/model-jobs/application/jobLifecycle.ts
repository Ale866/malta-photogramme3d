import { MODEL_JOB_STATUS, type ModelJob, type UpdateModelJobStateInput } from "../domain/modelJobRepository";
import {
  clampProgress,
} from "../domain/modelJobState";
import type { ModelJobServices } from "./ports";
import { badRequest, notFound, } from "../../../shared/errors/applicationError";

export type CreateQueuedModelJobInput = {
  ownerId: string;
  title: string;
  imagePaths: string[];
  inputFolder: string;
  outputFolder: string;
  coordinates: {
    x: number;
    y: number;
    z: number;
  };
};

export async function createQueuedModelJob(services: ModelJobServices, input: CreateQueuedModelJobInput): Promise<ModelJob> {
  const ownerId = typeof input.ownerId === "string" ? input.ownerId.trim() : "";
  if (!ownerId) throw badRequest("Missing ownerId", "owner_id_required");

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) throw badRequest("Title is required", "title_required");

  if (!Array.isArray(input.imagePaths) || input.imagePaths.length === 0) {
    throw badRequest("No images uploaded", "images_required");
  }

  return services.modelJobs.create({
    ownerId,
    title,
    status: MODEL_JOB_STATUS.QUEUED,
    imagePaths: input.imagePaths,
    inputFolder: input.inputFolder,
    outputFolder: input.outputFolder,
    coordinates: input.coordinates,
    stage: MODEL_JOB_STATUS.QUEUED,
    progress: 0,
    error: null,
    modelId: null,
    startedAt: null,
    finishedAt: null,
  });
}

function requireJobId(jobId: string) {
  const normalized = typeof jobId === "string" ? jobId.trim() : "";
  if (!normalized) throw badRequest("Missing jobId", "job_id_required");
  return normalized;
}

export async function setModelJobStageActive(
  services: ModelJobServices,
  jobId: string,
  input: { status: ModelJob["status"]; stage: string; progress: number }
): Promise<ModelJob> {
  const normalizedJobId = requireJobId(jobId);
  const job = await requireExistingJob(services, normalizedJobId);

  const updated = await services.modelJobs.updateState(normalizedJobId, {
    status: input.status,
    stage: input.stage.trim(),
    progress: Math.max(clampProgress(input.progress), clampProgress(job.progress)),
    startedAt: job.startedAt ?? new Date(),
    error: null,
  });

  if (!updated) throw notFound("Job not found", "job_not_found");
  return updated;
}

export type UpdateModelJobRuntimeInput = {
  stage?: string;
  progress?: number;
};

export async function updateModelJobRuntime(services: ModelJobServices, jobId: string, input: UpdateModelJobRuntimeInput): Promise<ModelJob> {
  const normalizedJobId = requireJobId(jobId);
  const job = await requireExistingJob(services, normalizedJobId);

  if (job.status === "completed" || job.status === "failed") {
    return job;
  }

  const patch: UpdateModelJobStateInput = {};

  if (typeof input.stage === "string" && input.stage.trim()) patch.stage = input.stage.trim();
  if (typeof input.progress === "number") patch.progress = clampProgress(input.progress);

  const updated = await services.modelJobs.updateState(normalizedJobId, patch);
  if (!updated) throw notFound("Job not found", "job_not_found");

  return updated;
}

export async function setModelJobCompleted(services: ModelJobServices, jobId: string, input: { modelId: string }): Promise<ModelJob> {
  const normalizedJobId = requireJobId(jobId);
  const modelId = typeof input.modelId === "string" ? input.modelId.trim() : "";
  if (!modelId) throw badRequest("Missing modelId", "model_id_required");

  await requireExistingJob(services, normalizedJobId);

  const updated = await services.modelJobs.updateState(normalizedJobId, {
    status: MODEL_JOB_STATUS.COMPLETED,
    stage: MODEL_JOB_STATUS.COMPLETED,
    progress: 100,
    error: null,
    modelId,
    finishedAt: new Date(),
  });

  if (!updated) throw notFound("Job not found", "job_not_found");
  return updated;
}

export async function setModelJobFailed(
  services: ModelJobServices,
  jobId: string,
  input?: { error?: string; stage?: string; progress?: number }
): Promise<ModelJob> {
  const normalizedJobId = requireJobId(jobId);
  await requireExistingJob(services, normalizedJobId);

  const errorMessage =
    typeof input?.error === "string" && input.error.trim() ? input.error.trim() : "Pipeline failed";

  const updated = await services.modelJobs.updateState(normalizedJobId, {
    status: MODEL_JOB_STATUS.FAILED,
    ...(typeof input?.stage === "string" && input.stage.trim() ? { stage: input.stage.trim() } : {}),
    ...(typeof input?.progress === "number" ? { progress: clampProgress(input.progress) } : {}),
    error: errorMessage,
    finishedAt: new Date(),
  });

  if (!updated) throw notFound("Job not found", "job_not_found");
  return updated;
}

async function requireExistingJob(services: ModelJobServices, jobId: string): Promise<ModelJob> {
  const job = await services.modelJobs.findById(jobId);
  if (!job) throw notFound("Job not found", "job_not_found");
  return job;
}
