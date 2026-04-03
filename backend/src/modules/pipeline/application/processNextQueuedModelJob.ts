import { claimNextQueuedJob } from "../../model-jobs/application/claimNextQueuedJob";
import { MODEL_JOB_STATUS, type ModelJobRepository } from "../../model-jobs/domain/modelJobRepository";
import type { ModelRepository } from "../../model/domain/modelRepository";
import { executeModelJob } from "./executeModelJob";
import type { PipelineServices } from "./ports";

type ProcessNextQueuedModelJobServices = {
  modelJobs: ModelJobRepository;
  models: ModelRepository;
  pipelines: {
    strict: PipelineServices;
    relaxed: PipelineServices;
  };
};

export async function processNextQueuedModelJob(
  services: ProcessNextQueuedModelJobServices
): Promise<boolean> {
  const job = await claimNextQueuedJob({ modelJobs: services.modelJobs });
  if (!job) return false;

  const pipeline = job.status === MODEL_JOB_STATUS.QUEUED_TO_RERUN
    ? services.pipelines.relaxed
    : services.pipelines.strict;

  await executeModelJob({ ...services, pipeline }, { jobId: job.id });
  return true;
}
