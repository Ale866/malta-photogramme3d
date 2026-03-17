import { type CreatePasswordResetTokenInput, type PasswordResetToken, } from '../../domain/passwordResetTokenRepository';
import { PasswordResetTokenSchema } from '../db/PasswordResetTokenSchema';

export const passwordResetTokenRepo = {
  async create(input: CreatePasswordResetTokenInput): Promise<PasswordResetToken> {
    const doc = await PasswordResetTokenSchema.create({
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      usedAt: null,
      invalidatedAt: null,
    });

    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      tokenHash: doc.tokenHash,
      expiresAt: doc.expiresAt,
      usedAt: doc.usedAt ?? null,
      invalidatedAt: doc.invalidatedAt ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  },

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const doc = await PasswordResetTokenSchema.findOne({ tokenHash });
    if (!doc) return null;

    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      tokenHash: doc.tokenHash,
      expiresAt: doc.expiresAt,
      usedAt: doc.usedAt ?? null,
      invalidatedAt: doc.invalidatedAt ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  },

  async markUsed(tokenId: string, usedAt: Date): Promise<void> {
    await PasswordResetTokenSchema.updateOne(
      { _id: tokenId, usedAt: null, invalidatedAt: null },
      { $set: { usedAt } }
    );
  },

  async invalidate(tokenId: string, invalidatedAt: Date): Promise<void> {
    await PasswordResetTokenSchema.updateOne(
      { _id: tokenId, usedAt: null, invalidatedAt: null },
      { $set: { invalidatedAt } }
    );
  },

  async invalidateActiveTokensForUser(userId: string, invalidatedAt: Date): Promise<void> {
    await PasswordResetTokenSchema.updateMany(
      {
        userId,
        usedAt: null,
        invalidatedAt: null,
      },
      { $set: { invalidatedAt } }
    );
  },
};
