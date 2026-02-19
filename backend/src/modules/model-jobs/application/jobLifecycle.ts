import type { ModelJob } from "../domain/modelJobRepository";
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
  });
}

function requireJobId(jobId: string) {
  const normalized = typeof jobId === "string" ? jobId.trim() : "";
  if (!normalized) throw new Error("Missing jobId");
  return normalized;
}

export async function setModelJobRunning(services: ModelJobServices, jobId: string): Promise<void> {
  await services.modelJobs.setRunning(requireJobId(jobId));
}

export async function setModelJobDone(services: ModelJobServices, jobId: string): Promise<void> {
  await services.modelJobs.setDone(requireJobId(jobId));
}

export async function setModelJobFailed(services: ModelJobServices, jobId: string): Promise<void> {
  await services.modelJobs.setFailed(requireJobId(jobId));
}
