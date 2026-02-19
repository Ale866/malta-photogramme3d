import { ModelApi } from "../infrastructure/api";

export function use3dModel() {
  async function uploadModel(title: string, files: File[]) {
    const result = await ModelApi.upload({ title, files });
    return result;
  }

  async function getModels() {
    const result = await ModelApi.getModels();
    return result
  }

  return {
    uploadModel,
    getModels,
  }
}