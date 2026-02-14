import type { UserRepository } from '../../domain/auth/userRepository';
import type { SessionRepository } from '../../domain/auth/sessionRepository';

export type AuthServices = {
  users: UserRepository;
  sessions: SessionRepository;

  hashPassword: (plain: string) => Promise<string>;
  verifyPassword: (plain: string, hash: string) => Promise<boolean>;

  signAccessToken: (payload: { sub: string; email: string }) => string;

  generateRefreshToken: () => string;
  hashRefreshToken: (t: string) => string;
};
