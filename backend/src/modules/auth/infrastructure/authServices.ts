import type { AuthServices } from '../application/ports';
import { userRepo } from './repo/userRepo';
import { sessionRepo } from './repo/sessionRepo';
import { hashPassword, verifyPassword } from './auth/passwordHasher';
import { signAccessToken, verifyAccessToken } from './auth/tokenService';
import { generateRefreshToken, hashRefreshToken } from './auth/refreshTokenService';

export const authServices: AuthServices = {
  users: userRepo,
  sessions: sessionRepo,
  hashPassword,
  verifyPassword,
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
};
