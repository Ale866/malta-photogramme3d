import { ModelApi } from "../infrastructure/api";

export function use3dModel() {
  async function uploadModel(title: string, files: File[]) {
    const result = await ModelApi.upload({ title, files });
    return result;
  }

  return {
    uploadModel,
  }
}