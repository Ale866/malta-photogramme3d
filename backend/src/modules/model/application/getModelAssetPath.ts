import { notFound } from "../../../shared/errors/applicationError";
import type { ModelAssetServices } from "./ports";

export async function getModelMeshAssetPath(services: ModelAssetServices, modelId: string) {
  const model = await services.models.findById(modelId);
  if (!model) throw notFound("Model not found", "model_not_found");

  const assetPath = services.assets.resolveMeshPath(model.outputFolder);
  if (!assetPath) throw notFound("Model mesh asset not found", "model_mesh_not_found");

  return assetPath;
}

export async function getModelTextureAssetPath(services: ModelAssetServices, modelId: string) {
  const model = await services.models.findById(modelId);
  if (!model) throw notFound("Model not found", "model_not_found");

  const assetPath = services.assets.resolveTexturePath(model.outputFolder);
  if (!assetPath) throw notFound("Model texture asset not found", "model_texture_not_found");

  return assetPath;
}
