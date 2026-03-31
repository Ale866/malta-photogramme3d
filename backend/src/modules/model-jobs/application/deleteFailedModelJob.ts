import { forbidden, notFound } from "../../../shared/errors/applicationError";
import { MODEL_JOB_STATUS } from "../domain/modelJobRepository";
import type { FailedModelJobDeletionServices } from "./ports";

export async function deleteFailedModelJob(
  dependencies: FailedModelJobDeletionServices,
  input: { jobId: string; ownerId: string }
) {
  const job = await dependencies.modelJobs.findById(input.jobId);
  if (!job) throw notFound("Model job not found", "model_job_not_found");
  if (job.ownerId !== input.ownerId) throw forbidden("You can only delete your own jobs");
  if (job.status !== MODEL_JOB_STATUS.FAILED) {
    throw forbidden("Only failed jobs can be deleted", "model_job_delete_forbidden");
  }

  await dependencies.modelJobs.deleteById(job.id);
  dependencies.deleteDirectory(job.inputFolder);
  dependencies.deleteDirectory(job.outputFolder);
}
