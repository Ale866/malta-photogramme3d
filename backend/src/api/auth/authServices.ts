import type { AuthServices } from '../../application/auth/services';
import { userRepo } from '../../infrastructure/repo/userRepo';
import { sessionRepo } from '../../infrastructure/repo/sessionRepo';
import { hashPassword, verifyPassword } from '../../infrastructure/auth/passwordHasher';
import { signAccessToken } from '../../infrastructure/auth/tokenService';
import { generateRefreshToken, hashRefreshToken } from '../../infrastructure/auth/refreshTokenService';

export const authServices: AuthServices = {
  users: userRepo,
  sessions: sessionRepo,
  hashPassword,
  verifyPassword,
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
};
