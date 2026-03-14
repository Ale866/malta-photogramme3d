import type { AuthServices } from './ports';
import { ttlToMs } from '../../../shared/utils/timestamp';
import { config } from '../../../shared/config/env';
import { badRequest, unauthorized } from '../../../shared/errors/applicationError';

type LoginInput = {
  email: string;
  password: string;
  userAgent?: string;
};

export async function login(services: AuthServices, input: LoginInput) {
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!email) throw badRequest('Email is required', 'email_required');
  if (!password) throw badRequest('Password is required', 'password_required');

  const user = await services.users.findByEmailWithPassword(email);
  if (!user) throw unauthorized('Invalid credentials', 'invalid_credentials');

  const ok = await services.verifyPassword(password, user.passwordHash);
  if (!ok) throw unauthorized('Invalid credentials', 'invalid_credentials');

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

  return {
    accessToken: accessToken.token,
    accessTokenExpiresAt: accessToken.expiresAt,
    user: safeUser,
    refreshToken,
  };
}
