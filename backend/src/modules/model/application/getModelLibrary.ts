import type { ModelLibraryServices } from './ports';
import { toUserModelLibraryDto, type UserModelLibraryDto } from './modelLibraryDto';

export async function getUserModelLibrary(services: ModelLibraryServices, input: { ownerId: string }): Promise<UserModelLibraryDto> {

  const [models, modelJobs] = await Promise.all([
    services.models.listByOwner(input.ownerId),
    services.modelJobs.listIncompleteByOwner(input.ownerId),
  ]);

  return toUserModelLibraryDto({ models, modelJobs });
}
