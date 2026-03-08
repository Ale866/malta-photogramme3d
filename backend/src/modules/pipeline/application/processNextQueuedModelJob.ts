import { claimNextQueuedJob } from "../../model-jobs/application/claimNextQueuedJob";
import type { ModelJobStatusDto } from "../../model-jobs/application/jobStatusDto";
import type { ModelJobRepository } from "../../model-jobs/domain/modelJobRepository";
import type { ModelRepository } from "../../model/domain/modelRepository";
import { executeModelJob } from "./executeModelJob";
import type { PipelineServices } from "./ports";

type ProcessNextQueuedModelJobServices = {
  modelJobs: ModelJobRepository;
  models: ModelRepository;
  pipeline: PipelineServices;
  jobRealtime?: {
    emitUpdate: (job: ModelJobStatusDto) => void;
  };
};

export async function processNextQueuedModelJob(
  services: ProcessNextQueuedModelJobServices
): Promise<boolean> {
  const job = await claimNextQueuedJob({ modelJobs: services.modelJobs });
  if (!job) return false;

  await executeModelJob(services, { jobId: job.id });
  return true;
}
