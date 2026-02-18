export type Session = {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type SessionWithHash = Session & {
  refreshTokenHash: string;
};

export type CreateSessionInput = {
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  userAgent?: string;
};

export interface SessionRepository {
  create(input: CreateSessionInput): Promise<Session>;
  findByRefreshTokenHash(hash: string): Promise<SessionWithHash | null>;
  revoke(sessionId: string): Promise<void>;
}