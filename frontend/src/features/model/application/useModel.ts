import { ModelApi } from "../infrastructure/api";
import type { ModelCreationDraft } from "../domain/ModelCreationDraft";
import type { ModelJobSnapshot } from "../domain/ModelJob";

export function use3dModel() {
  async function uploadModel(input: ModelCreationDraft) {
    const result = await ModelApi.upload({
      title: input.title,
      files: input.files,
      coordinates: input.coordinates,
    });
    return result;
  }

  async function getModels() {
    const result = await ModelApi.getModels();
    return result
  }

  async function getModelJobStatus(jobId: string): Promise<ModelJobSnapshot> {
    const result = await ModelApi.getModelJobStatus(jobId);
    return result;
  }

  return {
    uploadModel,
    getModels,
    getModelJobStatus,
  }
}
