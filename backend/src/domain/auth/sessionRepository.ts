export type SessionDTO = {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type SessionWithHash = SessionDTO & {
  refreshTokenHash: string;
};

export interface SessionRepository {
  create(input: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
  }): Promise<SessionDTO>;
  findByRefreshTokenHash(hash: string): Promise<SessionWithHash | null>;
  revoke(sessionId: string): Promise<void>;
}