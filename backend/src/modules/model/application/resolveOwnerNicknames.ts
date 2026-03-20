import type { UserRepository } from '../../auth/domain/userRepository';

export async function resolveOwnerNicknames(users: UserRepository, ownerIds: string[]): Promise<Map<string, string>> {
  const uniqueOwnerIds = Array.from(new Set(ownerIds.filter((ownerId) => ownerId.trim().length > 0)));
  const entries = await Promise.all(uniqueOwnerIds.map(async (ownerId) => {
    const user = await users.findById(ownerId);
    return [ownerId, user?.nickname ?? 'Unknown user'] as const;
  }));

  return new Map(entries);
}
