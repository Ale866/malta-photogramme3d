export type PasswordResetToken = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  invalidatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreatePasswordResetTokenInput = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

export interface PasswordResetTokenRepository {
  create(input: CreatePasswordResetTokenInput): Promise<PasswordResetToken>;
  findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null>;
  markUsed(tokenId: string, usedAt: Date): Promise<void>;
  invalidate(tokenId: string, invalidatedAt: Date): Promise<void>;
  invalidateActiveTokensForUser(userId: string, invalidatedAt: Date): Promise<void>;
}
