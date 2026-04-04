import { ModelApi } from "../infrastructure/api";
import type { UploadProgressSnapshot } from "../infrastructure/api";
import { authStore, requireAccessToken } from "@/features/auth/application/useAuth";
import type { ModelCreationDraft } from "../domain/ModelCreationDraft";
import type { ModelJobDetails } from "../domain/ModelJobDetails";
import type { ModelLibrary } from "../domain/ModelLibrary";
import type { ModelJobSnapshot } from "../domain/ModelJob";
import type { ModelSummary, ModelVoteState } from "../domain/ModelSummary";

export function use3dModel() {
  async function uploadModel(
    input: ModelCreationDraft,
    hooks?: { onProgress?: (snapshot: UploadProgressSnapshot) => void }
  ) {
    const accessToken = await requireAccessToken();
    const result = await ModelApi.upload({
      title: input.title,
      type: input.type,
      ...(input.type === 'video'
        ? { videoFiles: input.videoFiles }
        : { files: input.files }),
      coordinates: input.coordinates,
    }, accessToken, hooks);
    return result;
  }

  async function getModelLibrary(): Promise<ModelLibrary> {
    const accessToken = await requireAccessToken();
    const result = await ModelApi.getModelLibrary(accessToken);
    return result;
  }

  async function getPublicModelCatalog(): Promise<ModelLibrary> {
    await authStore.hydrateSession();
    const accessToken = authStore.getAccessToken();
    const result = await ModelApi.getPublicModelCatalog(accessToken);
    return result;
  }

  async function getPublicModelById(modelId: string): Promise<ModelSummary> {
    await authStore.hydrateSession();
    const accessToken = authStore.getAccessToken();
    return ModelApi.getPublicModelById(modelId, accessToken);
  }

  async function getUserModelById(modelId: string): Promise<ModelSummary> {
    const accessToken = await requireAccessToken();
    return ModelApi.getUserModelById(modelId, accessToken);
  }

  async function getIslandModelCatalog(): Promise<ModelLibrary> {
    await authStore.hydrateSession();
    const accessToken = authStore.getAccessToken();
    return ModelApi.getIslandModelCatalog(accessToken);
  }

  async function voteForModel(modelId: string): Promise<ModelVoteState> {
    const accessToken = await requireAccessToken();
    return ModelApi.voteForModel(modelId, accessToken);
  }

  async function unvoteForModel(modelId: string): Promise<ModelVoteState> {
    const accessToken = await requireAccessToken();
    return ModelApi.unvoteForModel(modelId, accessToken);
  }

  async function getModelJobStatus(jobId: string): Promise<ModelJobSnapshot> {
    const accessToken = await requireAccessToken();
    const result = await ModelApi.getModelJobStatus(jobId, accessToken);
    return result;
  }

  async function getModelJobDetails(jobId: string): Promise<ModelJobDetails> {
    const accessToken = await requireAccessToken();
    const result = await ModelApi.getModelJobDetails(jobId, accessToken);
    return result;
  }

  async function deleteModel(modelId: string): Promise<void> {
    const accessToken = await requireAccessToken();
    await ModelApi.deleteModel(modelId, accessToken);
  }

  async function deleteFailedModelJob(jobId: string): Promise<void> {
    const accessToken = await requireAccessToken();
    await ModelApi.deleteFailedModelJob(jobId, accessToken);
  }

  async function rerunFailedModelJob(jobId: string): Promise<void> {
    const accessToken = await requireAccessToken();
    await ModelApi.rerunFailedModelJob(jobId, accessToken);
  }

  return {
    uploadModel,
    getModelLibrary,
    getPublicModelCatalog,
    getPublicModelById,
    getUserModelById,
    getIslandModelCatalog,
    voteForModel,
    unvoteForModel,
    getModelJobStatus,
    getModelJobDetails,
    deleteModel,
    deleteFailedModelJob,
    rerunFailedModelJob,
  }
}
