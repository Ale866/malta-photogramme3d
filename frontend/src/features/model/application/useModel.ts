import { ModelApi } from "../infrastructure/api";
import type { ModelCreationDraft } from "../domain/ModelCreationDraft";
import type { ModelLibrary } from "../domain/ModelLibrary";
import type { ModelJobSnapshot } from "../domain/ModelJob";
import type { ModelSummary } from "../domain/ModelSummary";

export function use3dModel() {
  async function uploadModel(input: ModelCreationDraft) {
    const result = await ModelApi.upload({
      title: input.title,
      files: input.files,
      coordinates: input.coordinates,
    });
    return result;
  }

  async function getModels(): Promise<ModelSummary[]> {
    const result = await ModelApi.getModels();
    return result;
  }

  async function getModelLibrary(): Promise<ModelLibrary> {
    const result = await ModelApi.getModelLibrary();
    return result;
  }

  async function getModelJobStatus(jobId: string): Promise<ModelJobSnapshot> {
    const result = await ModelApi.getModelJobStatus(jobId);
    return result;
  }

  return {
    uploadModel,
    getModels,
    getModelLibrary,
    getModelJobStatus,
  }
}
