import { toModelCatalogDto } from './modelLibraryDto';
import { resolveOwnerNicknames } from './resolveOwnerNicknames';
import type { ModelsServices } from './ports';

export async function getIslandModels(services: ModelsServices, currentUserId?: string) {
  const models = await services.models.listIslandCatalog();
  const ownerNicknames = await resolveOwnerNicknames(services.users, models.map((model) => model.ownerId));

  return toModelCatalogDto({
    models,
    ownerNicknames,
    currentUserId,
  });
}
