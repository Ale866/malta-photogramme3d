import type { UserRepository } from '../domain/userRepository';
import type { SessionRepository } from '../domain/sessionRepository';
import type { PasswordResetTokenRepository } from '../domain/passwordResetTokenRepository';

export type WelcomeEmailInput = {
  to: string;
  nickname: string;
};

export type PasswordResetEmailInput = {
  to: string;
  nickname: string;
  resetLink: string;
  expiresInMinutes: number;
};

export interface AuthEmailService {
  sendWelcomeEmail(input: WelcomeEmailInput): Promise<void>;
  sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void>;
}

export type AuthServices = {
  users: UserRepository;
  sessions: SessionRepository;
  passwordResetTokens: PasswordResetTokenRepository;
  authEmailService: AuthEmailService;

  hashPassword: (plain: string) => Promise<string>;
  verifyPassword: (plain: string, hash: string) => Promise<boolean>;

  signAccessToken: (payload: { sub: string; email: string }) => {
    token: string;
    expiresAt: Date;
  };
  verifyAccessToken: (token: string) => { sub: string; email: string };

  generateRefreshToken: () => string;
  hashRefreshToken: (t: string) => string;
  generatePasswordResetToken: () => string;
  hashPasswordResetToken: (t: string) => string;
};
