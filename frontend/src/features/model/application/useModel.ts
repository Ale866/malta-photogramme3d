import { ModelApi } from "../infrastructure/api";
import { requireAccessToken } from "@/features/auth/application/useAuth";
import type { ModelCreationDraft } from "../domain/ModelCreationDraft";
import type { ModelLibrary } from "../domain/ModelLibrary";
import type { ModelJobSnapshot } from "../domain/ModelJob";

export function use3dModel() {
  async function uploadModel(input: ModelCreationDraft) {
    const accessToken = await requireAccessToken();
    const result = await ModelApi.upload({
      title: input.title,
      files: input.files,
      coordinates: input.coordinates,
    }, accessToken);
    return result;
  }

  async function getModelLibrary(): Promise<ModelLibrary> {
    const accessToken = await requireAccessToken();
    const result = await ModelApi.getModelLibrary(accessToken);
    return result;
  }

  async function getPublicModelCatalog(): Promise<ModelLibrary> {
    const result = await ModelApi.getPublicModelCatalog();
    return result;
  }

  async function getModelJobStatus(jobId: string): Promise<ModelJobSnapshot> {
    const accessToken = await requireAccessToken();
    const result = await ModelApi.getModelJobStatus(jobId, accessToken);
    return result;
  }

  return {
    uploadModel,
    getModelLibrary,
    getPublicModelCatalog,
    getModelJobStatus,
  }
}
