import type { AuthServices } from './services';
import { ttlToMs } from '../../utils/timestamp';
import { config } from '../../config/env';

type LoginInput = {
  email: string;
  password: string;
  userAgent?: string;
};

export async function login(services: AuthServices, input: LoginInput) {
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!email) throw new Error('Email is required');
  if (!password) throw new Error('Password is required');

  const user = await services.users.findByEmailWithPassword(email);
  if (!user) throw new Error('Email does not exist');

  const ok = await services.verifyPassword(password, user.passwordHash);
  if (!ok) throw new Error('Invalid password');

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

  const { passwordHash, ...safeUser } = user;

  return { accessToken, user: safeUser, refreshToken };
}