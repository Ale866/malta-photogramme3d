import type { AuthServices } from './ports';
import { ttlToMs } from '../../../shared/utils/timestamp';
import { config } from '../../../shared/config/env';
import {
  notFound,
  unauthorized,
} from '../../../shared/errors/applicationError';

type RefreshInput = {
  refreshToken?: string;
  userAgent?: string;
};

export async function refresh(services: AuthServices, input: RefreshInput) {
  const token = input.refreshToken;
  if (!token) throw unauthorized('Not authenticated', 'refresh_token_required');

  const hash = services.hashRefreshToken(token);

  const session = await services.sessions.findByRefreshTokenHash(hash);
  if (!session) throw unauthorized('Invalid refresh token', 'invalid_refresh_token');

  if (session.revokedAt) throw unauthorized('Refresh token revoked', 'refresh_token_revoked');
  if (session.expiresAt.getTime() < Date.now()) throw unauthorized('Refresh token expired', 'refresh_token_expired');

  await services.sessions.revoke(session.id);

  const newRefreshToken = services.generateRefreshToken();
  const newRefreshTokenHash = services.hashRefreshToken(newRefreshToken);
  const newExpiresAt = new Date(Date.now() + ttlToMs(config.JWT_REFRESH_TTL));

  await services.sessions.create({
    userId: session.userId,
    refreshTokenHash: newRefreshTokenHash,
    expiresAt: newExpiresAt,
    userAgent: input.userAgent,
  });

  const user = await services.users.findById(session.userId);
  if (!user) throw notFound('User not found', 'user_not_found');

  const accessToken = services.signAccessToken({ sub: user.id, email: user.email });

  return {
    accessToken: accessToken.token,
    accessTokenExpiresAt: accessToken.expiresAt,
    user,
    refreshToken: newRefreshToken,
  };
}
