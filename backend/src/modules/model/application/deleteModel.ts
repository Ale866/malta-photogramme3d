import { forbidden, notFound } from "../../../shared/errors/applicationError";
import type { ModelDeletionServices } from "./ports";

export async function deleteModel(
  dependencies: ModelDeletionServices,
  input: { modelId: string; ownerId: string }
) {
  const model = await dependencies.models.findById(input.modelId);
  if (!model) throw notFound("Model not found", "model_not_found");
  if (model.ownerId !== input.ownerId) throw forbidden("You can only delete your own models");

  const sourceJob = model.sourceJobId ? await dependencies.modelJobs.findById(model.sourceJobId) : null;

  if (model.sourceJobId) {
    await dependencies.modelJobs.updateState(model.sourceJobId, { modelId: null });
  }

  await dependencies.models.deleteById(model.id);
  if (sourceJob) {
    await dependencies.modelJobs.deleteById(sourceJob.id);
    dependencies.deleteDirectory(sourceJob.inputFolder);
    if (sourceJob.outputFolder !== model.outputFolder) {
      dependencies.deleteDirectory(sourceJob.outputFolder);
    }
  }
  dependencies.deleteDirectory(model.outputFolder);
}
