import type { ModelJob, UpdateModelJobStateInput } from "../domain/modelJobRepository";
import {
  assertModelJobStatusTransition,
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
    status: "queued",
    imagePaths: input.imagePaths,
    inputFolder: input.inputFolder,
    outputFolder: input.outputFolder,
    coordinates: input.coordinates,
    stage: "starting",
    progress: 0,
    logTail: [],
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

export async function setModelJobRunning(services: ModelJobServices, jobId: string): Promise<ModelJob> {
  const normalizedJobId = requireJobId(jobId);
  const job = await requireExistingJob(services, normalizedJobId);

  assertModelJobStatusTransition(job.status, "running");

  const updated = await services.modelJobs.updateState(normalizedJobId, {
    status: "running",
    stage: "starting",
    progress: Math.max(1, clampProgress(job.progress)),
    startedAt: job.startedAt ?? new Date(),
  });

  if (!updated) throw notFound("Job not found", "job_not_found");
  return updated;
}

export type UpdateModelJobRuntimeInput = {
  stage?: string;
  progress?: number;
  logTail?: string[];
};

export async function updateModelJobRuntime(services: ModelJobServices, jobId: string, input: UpdateModelJobRuntimeInput): Promise<ModelJob> {
  const normalizedJobId = requireJobId(jobId);
  const job = await requireExistingJob(services, normalizedJobId);

  if (job.status === "succeeded" || job.status === "failed") {
    return job;
  }

  const patch: UpdateModelJobStateInput = {};

  if (typeof input.stage === "string" && input.stage.trim()) patch.stage = input.stage.trim();
  if (typeof input.progress === "number") patch.progress = clampProgress(input.progress);
  if (Array.isArray(input.logTail)) patch.logTail = input.logTail;

  const updated = await services.modelJobs.updateState(normalizedJobId, patch);
  if (!updated) throw notFound("Job not found", "job_not_found");

  return updated;
}

export async function setModelJobSucceeded(services: ModelJobServices, jobId: string, input: { modelId: string }): Promise<ModelJob> {
  const normalizedJobId = requireJobId(jobId);
  const modelId = typeof input.modelId === "string" ? input.modelId.trim() : "";
  if (!modelId) throw badRequest("Missing modelId", "model_id_required");

  const job = await requireExistingJob(services, normalizedJobId);
  assertModelJobStatusTransition(job.status, "succeeded");

  const updated = await services.modelJobs.updateState(normalizedJobId, {
    status: "succeeded",
    stage: "done",
    progress: 100,
    error: null,
    modelId,
    finishedAt: new Date(),
  });

  if (!updated) throw notFound("Job not found", "job_not_found");
  return updated;
}

export async function setModelJobFailed(services: ModelJobServices, jobId: string, input?: { error?: string }): Promise<ModelJob> {
  const normalizedJobId = requireJobId(jobId);
  const job = await requireExistingJob(services, normalizedJobId);

  assertModelJobStatusTransition(job.status, "failed");

  const errorMessage =
    typeof input?.error === "string" && input.error.trim() ? input.error.trim() : "Pipeline failed";

  const updated = await services.modelJobs.updateState(normalizedJobId, {
    status: "failed",
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
