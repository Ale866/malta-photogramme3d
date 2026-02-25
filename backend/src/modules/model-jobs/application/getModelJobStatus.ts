import type { ModelJobServices } from "./ports";
import { toModelJobStatusDto, type ModelJobStatusDto } from "./jobStatusDto";

type GetModelJobStatusInput = {
  jobId: string;
  ownerId: string;
};

export async function getModelJobStatus(
  services: ModelJobServices,
  input: GetModelJobStatusInput
): Promise<ModelJobStatusDto> {
  const jobId = typeof input.jobId === "string" ? input.jobId.trim() : "";
  if (!jobId) throw new Error("Missing jobId");

  const ownerId = typeof input.ownerId === "string" ? input.ownerId.trim() : "";
  if (!ownerId) throw new Error("Missing ownerId");

  const job = await services.modelJobs.findById(jobId);
  if (!job) throw new Error("Job not found");
  if (job.ownerId !== ownerId) throw new Error("Forbidden");

  return toModelJobStatusDto(job);
}
