import type { ModelLibraryServices } from './ports';
import { toUserModelLibraryDto, type UserModelLibraryDto } from './modelLibraryDto';
import { badRequest } from '../../../shared/errors/applicationError';

export async function getUserModelLibrary(services: ModelLibraryServices, input: { ownerId: string }): Promise<UserModelLibraryDto> {
  const ownerId = typeof input.ownerId === "string" ? input.ownerId.trim() : "";
  if (!ownerId) throw badRequest("Missing ownerId", "owner_id_required");

  const [models, modelJobs] = await Promise.all([
    services.models.listByOwner(ownerId),
    services.modelJobs.listNonCompletedByOwner(ownerId),
  ]);

  return toUserModelLibraryDto({ models, modelJobs });
}
