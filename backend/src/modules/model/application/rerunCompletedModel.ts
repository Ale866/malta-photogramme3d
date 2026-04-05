import { badRequest, forbidden, notFound } from "../../../shared/errors/applicationError";
import { MODEL_JOB_STATUS } from "../../model-jobs/domain/modelJobRepository";
import type { ModelRerunServices } from "./ports";

export async function rerunCompletedModel(dependencies: ModelRerunServices, input: { modelId: string; ownerId: string }) {
  const modelId = typeof input.modelId === "string" ? input.modelId.trim() : "";
  if (!modelId) throw badRequest("Missing modelId", "model_id_required");

  const ownerId = typeof input.ownerId === "string" ? input.ownerId.trim() : "";
  if (!ownerId) throw badRequest("Missing ownerId", "owner_id_required");

  const model = await dependencies.models.findById(modelId);
  if (!model) throw notFound("Model not found", "model_not_found");
  if (model.ownerId !== ownerId) throw forbidden("You can only rerun your own models");
  if (!model.sourceJobId) {
    throw forbidden("This model cannot be rerun", "model_rerun_forbidden");
  }

  const sourceJob = await dependencies.modelJobs.findById(model.sourceJobId);
  if (!sourceJob) throw notFound("Source job not found", "model_source_job_not_found");
  if (sourceJob.ownerId !== ownerId) throw forbidden("You can only rerun your own models");
  if (sourceJob.hasBeenRerun) {
    throw forbidden("This reconstruction can only be rerun once", "model_rerun_limit_reached");
  }
  if (sourceJob.status !== MODEL_JOB_STATUS.COMPLETED) {
    throw forbidden("Only completed reconstructions can be rerun", "model_rerun_forbidden");
  }

  await dependencies.models.deleteById(model.id);
  dependencies.deleteDirectory(model.outputFolder);

  const updatedJob = await dependencies.modelJobs.updateState(sourceJob.id, {
    status: MODEL_JOB_STATUS.QUEUED_TO_RERUN,
    stage: MODEL_JOB_STATUS.QUEUED_TO_RERUN,
    progress: 0,
    error: null,
    modelId: null,
    hasBeenRerun: true,
    startedAt: null,
    finishedAt: null,
  });

  if (!updatedJob) throw notFound("Source job not found", "model_source_job_not_found");
  return updatedJob;
}
