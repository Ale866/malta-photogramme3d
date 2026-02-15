import type { AuthServices } from './services';
import { ttlToMs } from '../../utils/timestamp';
import { config } from '../../config/env';

type RefreshInput = {
  refreshToken: string;
  userAgent?: string;
};

export async function refresh(services: AuthServices, input: RefreshInput) {
  const token = input.refreshToken;
  if (!token) throw new Error('Missing refresh token');

  const hash = services.hashRefreshToken(token);

  const session = await services.sessions.findByRefreshTokenHash(hash);
  if (!session) throw new Error('Invalid refresh token');

  if (session.revokedAt) throw new Error('Refresh token revoked');
  if (session.expiresAt.getTime() < Date.now()) throw new Error('Refresh token expired');

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
  if (!user) throw new Error('User not found');

  const accessToken = services.signAccessToken({ sub: user.id, email: user.email });

  return { accessToken, user, refreshToken: newRefreshToken };
}