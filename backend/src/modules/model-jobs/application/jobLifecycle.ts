import type { ModelJob } from "../domain/modelJobRepository";
import {
  assertModelJobStatusTransition,
  clampProgress,
} from "../domain/modelJobState";
import type { ModelJobServices } from "./ports";

export type CreateQueuedModelJobInput = {
  ownerId: string;
  title: string;
  imagePaths: string[];
  inputFolder: string;
  outputFolder: string;
};

export async function createQueuedModelJob(
  services: ModelJobServices,
  input: CreateQueuedModelJobInput
): Promise<ModelJob> {
  if (!input.ownerId) throw new Error("Missing ownerId");

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) throw new Error("Title is required");

  if (!Array.isArray(input.imagePaths) || input.imagePaths.length === 0) {
    throw new Error("No images uploaded");
  }

  return services.modelJobs.create({
    ownerId: input.ownerId,
    title,
    status: "queued",
    imagePaths: input.imagePaths,
    inputFolder: input.inputFolder,
    outputFolder: input.outputFolder,
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
  if (!normalized) throw new Error("Missing jobId");
  return normalized;
}

export async function setModelJobRunning(
  services: ModelJobServices,
  jobId: string
): Promise<ModelJob> {
  const normalizedJobId = requireJobId(jobId);
  const job = await requireExistingJob(services, normalizedJobId);

  assertModelJobStatusTransition(job.status, "running");

  const updated = await services.modelJobs.updateState(normalizedJobId, {
    status: "running",
    stage: "starting",
    progress: Math.max(1, clampProgress(job.progress)),
    startedAt: job.startedAt ?? new Date(),
  });

  if (!updated) throw new Error("Job not found");
  return updated;
}

export type UpdateModelJobRuntimeInput = {
  stage?: string;
  progress?: number;
  logTail?: string[];
};

export async function updateModelJobRuntime(
  services: ModelJobServices,
  jobId: string,
  input: UpdateModelJobRuntimeInput
): Promise<ModelJob> {
  const normalizedJobId = requireJobId(jobId);
  const job = await requireExistingJob(services, normalizedJobId);

  if (job.status === "succeeded" || job.status === "failed") {
    return job;
  }

  const patch: Parameters<ModelJobServices["modelJobs"]["updateState"]>[1] = {};

  if (typeof input.stage === "string" && input.stage.trim()) patch.stage = input.stage.trim();
  if (typeof input.progress === "number") patch.progress = clampProgress(input.progress);
  if (Array.isArray(input.logTail)) patch.logTail = input.logTail;

  const updated = await services.modelJobs.updateState(normalizedJobId, patch);
  if (!updated) throw new Error("Job not found");

  return updated;
}

export async function setModelJobSucceeded(
  services: ModelJobServices,
  jobId: string,
  input: { modelId: string }
): Promise<ModelJob> {
  const normalizedJobId = requireJobId(jobId);
  const modelId = typeof input.modelId === "string" ? input.modelId.trim() : "";
  if (!modelId) throw new Error("Missing modelId");

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

  if (!updated) throw new Error("Job not found");
  return updated;
}

export async function setModelJobFailed(
  services: ModelJobServices,
  jobId: string,
  input?: { error?: string }
): Promise<ModelJob> {
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

  if (!updated) throw new Error("Job not found");
  return updated;
}

async function requireExistingJob(services: ModelJobServices, jobId: string): Promise<ModelJob> {
  const job = await services.modelJobs.findById(jobId);
  if (!job) throw new Error("Job not found");
  return job;
}
