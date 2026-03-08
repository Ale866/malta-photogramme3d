import type { ModelJob } from "../domain/modelJobRepository";
import type { ModelJobServices } from "./ports";

export async function claimNextQueuedJob(services: ModelJobServices): Promise<ModelJob | null> {
  return services.modelJobs.claimNextQueued();
}
