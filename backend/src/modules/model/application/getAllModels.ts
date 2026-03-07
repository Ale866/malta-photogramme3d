import { ModelsServices } from "./ports";


export function getAllModels(services: ModelsServices){

  return services.models.listAllPublic()
}