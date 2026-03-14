import type { AuthServices } from './ports';
import { ttlToMs } from '../../../shared/utils/timestamp';
import { config } from '../../../shared/config/env';
import { badRequest, conflict } from '../../../shared/errors/applicationError';

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

  if (!email) throw badRequest('Email is required', 'email_required');
  if (!password) throw badRequest('Password is required', 'password_required');
  if (!nickname) throw badRequest('Nickname is required', 'nickname_required');
  if (nickname.length < 3) throw badRequest('Nickname must be at least 3 characters', 'nickname_too_short');
  if (password.length < 6) throw badRequest('Password must be at least 6 characters', 'password_too_short');

  const existing = await services.users.findByEmail(email);
  if (existing) throw conflict('Email already in use', 'email_in_use');

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

  return {
    accessToken: accessToken.token,
    accessTokenExpiresAt: accessToken.expiresAt,
    user,
    refreshToken,
  };
}
