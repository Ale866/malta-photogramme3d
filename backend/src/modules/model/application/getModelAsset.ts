import { notFound } from "../../../shared/errors/applicationError";
import type { ModelAssetServices } from "./ports";

export async function getModelMeshAsset(
  services: ModelAssetServices,
  modelId: string,
  acceptEncodingHeader: string | string[] | undefined,
) {
  const model = await services.models.findById(modelId);
  if (!model) throw notFound("Model not found", "model_not_found");

  const asset = await services.assets.resolveMeshDelivery(model.outputFolder, acceptEncodingHeader);
  if (!asset) throw notFound("Model mesh asset not found", "model_mesh_not_found");

  return asset;
}

export async function getModelTextureAsset(
  services: ModelAssetServices,
  modelId: string,
  acceptHeader: string | string[] | undefined,
) {
  const model = await services.models.findById(modelId);
  if (!model) throw notFound("Model not found", "model_not_found");

  const asset = await services.assets.resolveTextureDelivery(model.outputFolder, acceptHeader);
  if (!asset) throw notFound("Model texture asset not found", "model_texture_not_found");

  return asset;
}
