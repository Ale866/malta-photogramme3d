import { userRepo } from '../../infrastructure/repo/userRepo';
import { sessionRepo } from '../../infrastructure/repo/sessionRepo';
import { hashPassword } from '../../infrastructure/auth/passwordHasher';
import { generateRefreshToken, hashRefreshToken } from '../../infrastructure/auth/refreshTokenService';
import { signAccessToken } from '../../infrastructure/auth/tokenService';
import { config } from '../../config/env';
import { ttlToMs } from '../../utils/timestamp';

type RegisterInput = {
  email: string;
  password: string;
  nickname: string;
  userAgent?: string;
};

export async function register(input: RegisterInput) {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const nickname = input.nickname.trim();

  if (!email) throw new Error('Email is required');
  if (!password) throw new Error('Password is required');
  if (!nickname) throw new Error('Nickname is required');

  if (password.length < 6) throw new Error('Password must be at least 6 characters');

  const existing = await userRepo.findByEmail(email);
  if (existing) throw new Error('Email already in use');

  const passwordHash = await hashPassword(password);
  const user = await userRepo.create({ email, passwordHash, nickname });

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);

  const expiresAt = new Date(Date.now() + ttlToMs(config.JWT_REFRESH_TTL));

  await sessionRepo.create({
    userId: user.id,
    refreshTokenHash,
    expiresAt,
    userAgent: input.userAgent,
  });

  const accessToken = signAccessToken({ sub: user.id, email: user.email });

  return { accessToken, user, refreshToken };
}