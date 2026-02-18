import type { UserRepository } from '../domain/userRepository';
import type { SessionRepository } from '../domain/sessionRepository';

export type AuthServices = {
  users: UserRepository;
  sessions: SessionRepository;

  hashPassword: (plain: string) => Promise<string>;
  verifyPassword: (plain: string, hash: string) => Promise<boolean>;

  signAccessToken: (payload: { sub: string; email: string }) => string;
  verifyAccessToken: (token: string) => { sub: string; email: string };

  generateRefreshToken: () => string;
  hashRefreshToken: (t: string) => string;
};
