import { ModelsServices } from "./ports";
import { toModelCatalogDto } from './modelLibraryDto';
import { resolveOwnerNicknames } from './resolveOwnerNicknames';


export async function getAllModels(services: ModelsServices){
  const models = await services.models.listAllPublic();
  const ownerNicknames = await resolveOwnerNicknames(services.users, models.map((model) => model.ownerId));

  return toModelCatalogDto({ models, ownerNicknames });
}
