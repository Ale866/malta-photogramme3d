import type { AuthServices } from '../application/ports';
import { userRepo } from './repo/userRepo';
import { sessionRepo } from './repo/sessionRepo';
import { passwordResetTokenRepo } from './repo/passwordResetTokenRepo';
import { hashPassword, verifyPassword } from './auth/passwordHasher';
import { signAccessToken, verifyAccessToken } from './auth/tokenService';
import { generateRefreshToken, hashRefreshToken } from './auth/refreshTokenService';
import { generatePasswordResetToken, hashPasswordResetToken } from './auth/passwordResetTokenService';
import { nodemailerAuthEmailService } from './email/nodemailerAuthEmailService';

export const authServices: AuthServices = {
  users: userRepo,
  sessions: sessionRepo,
  passwordResetTokens: passwordResetTokenRepo,
  authEmailService: nodemailerAuthEmailService,
  hashPassword,
  verifyPassword,
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  generatePasswordResetToken,
  hashPasswordResetToken,
};
