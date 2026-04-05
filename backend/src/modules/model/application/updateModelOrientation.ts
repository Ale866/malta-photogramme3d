import { badRequest, forbidden, notFound } from "../../../shared/errors/applicationError";
import type { ModelOrientation } from "../domain/modelRepository";
import type { ModelOrientationUpdateServices } from "./ports";

function normalizeOrientation(input: unknown): ModelOrientation {
  if (!input || typeof input !== "object") {
    throw badRequest("Orientation is required", "orientation_required");
  }

  const candidate = input as Partial<ModelOrientation>;
  const { x, y, z } = candidate;
  if (![x, y, z].every((value) => typeof value === "number" && Number.isFinite(value))) {
    throw badRequest("Orientation must contain valid numbers", "invalid_orientation");
  }

  return {
    x: x as number,
    y: y as number,
    z: z as number,
  };
}

export async function updateModelOrientation(
  dependencies: ModelOrientationUpdateServices,
  input: { modelId: string; ownerId: string; orientation: unknown }
) {
  const modelId = typeof input.modelId === "string" ? input.modelId.trim() : "";
  if (!modelId) throw badRequest("Missing modelId", "model_id_required");

  const ownerId = typeof input.ownerId === "string" ? input.ownerId.trim() : "";
  if (!ownerId) throw badRequest("Missing ownerId", "owner_id_required");

  const model = await dependencies.models.findById(modelId);
  if (!model) throw notFound("Model not found", "model_not_found");
  if (model.ownerId !== ownerId) throw forbidden("You can only edit your own models");

  const orientation = normalizeOrientation(input.orientation);
  const updatedModel = await dependencies.models.updateOrientation(model.id, orientation);
  if (!updatedModel) throw notFound("Model not found", "model_not_found");

  return updatedModel;
}
