import { ModelsServices } from "./ports";
import { toModelCatalogDto } from './modelLibraryDto';
import { resolveOwnerNicknames } from './resolveOwnerNicknames';


export async function getAllModels(services: ModelsServices, currentUserId?: string){
  const models = await services.models.listCatalog();
  const ownerNicknames = await resolveOwnerNicknames(services.users, models.map((model) => model.ownerId));

  return toModelCatalogDto({
    models,
    ownerNicknames,
    currentUserId,
  });
}
