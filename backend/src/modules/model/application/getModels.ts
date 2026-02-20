import { ModelsServices } from "./ports";

export async function getUserModels(services: ModelsServices, input: { ownerId: string }) {
  return services.models.listByOwner(input.ownerId);
} 