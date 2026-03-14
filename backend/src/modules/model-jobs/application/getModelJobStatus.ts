import type { ModelJobServices } from "./ports";
import { toModelJobStatusDto, type ModelJobStatusDto } from "./jobStatusDto";
import {
  badRequest,
  forbidden,
  notFound,
} from "../../../shared/errors/applicationError";

type GetModelJobStatusInput = {
  jobId: string;
  ownerId: string;
};

export async function getModelJobStatus(
  services: ModelJobServices,
  input: GetModelJobStatusInput
): Promise<ModelJobStatusDto> {
  const jobId = typeof input.jobId === "string" ? input.jobId.trim() : "";
  if (!jobId) throw badRequest("Missing jobId", "job_id_required");

  const ownerId = typeof input.ownerId === "string" ? input.ownerId.trim() : "";
  if (!ownerId) throw badRequest("Missing ownerId", "owner_id_required");

  const job = await services.modelJobs.findById(jobId);
  if (!job) throw notFound("Job not found", "job_not_found");
  if (job.ownerId !== ownerId) throw forbidden("Forbidden", "job_forbidden");

  return toModelJobStatusDto(job);
}
