import { badRequest, forbidden, notFound } from "../../../shared/errors/applicationError";
import { MODEL_JOB_STATUS } from "../domain/modelJobRepository";
import type { FailedModelJobRerunServices } from "./ports";

export async function rerunFailedModelJob(
  dependencies: FailedModelJobRerunServices,
  input: { jobId: string; ownerId: string }
) {
  const jobId = typeof input.jobId === "string" ? input.jobId.trim() : "";
  if (!jobId) throw badRequest("Missing jobId", "job_id_required");

  const ownerId = typeof input.ownerId === "string" ? input.ownerId.trim() : "";
  if (!ownerId) throw badRequest("Missing ownerId", "owner_id_required");

  const job = await dependencies.modelJobs.findById(jobId);
  if (!job) throw notFound("Model job not found", "model_job_not_found");
  if (job.ownerId !== ownerId) throw forbidden("You can only rerun your own jobs");
  if (job.status !== MODEL_JOB_STATUS.FAILED) {
    throw forbidden("Only failed jobs can be rerun", "model_job_rerun_forbidden");
  }
  if (job.hasBeenRerun) {
    throw forbidden("This reconstruction can only be retried once", "model_job_rerun_limit_reached");
  }

  dependencies.deleteDirectory(job.outputFolder);

  const updatedJob = await dependencies.modelJobs.updateState(job.id, {
    status: MODEL_JOB_STATUS.QUEUED_TO_RERUN,
    stage: MODEL_JOB_STATUS.QUEUED_TO_RERUN,
    progress: 0,
    error: null,
    modelId: null,
    hasBeenRerun: true,
    startedAt: null,
    finishedAt: null,
  });

  if (!updatedJob) throw notFound("Model job not found", "model_job_not_found");
  return updatedJob;
}
