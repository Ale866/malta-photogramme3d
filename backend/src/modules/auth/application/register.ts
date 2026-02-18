import type { AuthServices } from './ports';
import { ttlToMs } from '../../../shared/utils/timestamp';
import { config } from '../../../shared/config/env';

type RegisterInput = {
  email: string;
  password: string;
  nickname: string;
  userAgent?: string;
};

export async function register(services: AuthServices, input: RegisterInput) {

  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const nickname = input.nickname.trim();

  if (!email) throw new Error('Email is required');
  if (!password) throw new Error('Password is required');
  if (!nickname) throw new Error('Nickname is required');
  if (password.length < 6) throw new Error('Password must be at least 6 characters');

  const existing = await services.users.findByEmail(email);
  if (existing) throw new Error('Email already in use');

  const passwordHash = await services.hashPassword(password);
  const user = await services.users.create({ email, passwordHash, nickname });

  const refreshToken = services.generateRefreshToken();
  const refreshTokenHash = services.hashRefreshToken(refreshToken);

  const expiresAt = new Date(Date.now() + ttlToMs(config.JWT_REFRESH_TTL));

  await services.sessions.create({
    userId: user.id,
    refreshTokenHash,
    expiresAt,
    userAgent: input.userAgent,
  });

  const accessToken = services.signAccessToken({ sub: user.id, email: user.email });

  return { accessToken, user, refreshToken };
}
