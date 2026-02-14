import { SessionModel } from '../db/models/SessionModel';

export type SessionDTO = {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export const sessionRepo = {
  async create(input: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
  }): Promise<SessionDTO> {
    const doc = await SessionModel.create({
      userId: input.userId,
      refreshTokenHash: input.refreshTokenHash,
      expiresAt: input.expiresAt,
      revokedAt: null,
      userAgent: input.userAgent,
    });

    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      expiresAt: doc.expiresAt,
      revokedAt: doc.revokedAt ?? null,
    };
  },

  async findByRefreshTokenHash(hash: string): Promise<(SessionDTO & { refreshTokenHash: string }) | null> {
    const doc = await SessionModel.findOne({ refreshTokenHash: hash });
    if (!doc) return null;

    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      refreshTokenHash: doc.refreshTokenHash,
      expiresAt: doc.expiresAt,
      revokedAt: doc.revokedAt ?? null,
    };
  },

  async revoke(sessionId: string): Promise<void> {
    await SessionModel.updateOne(
      { _id: sessionId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  },
};