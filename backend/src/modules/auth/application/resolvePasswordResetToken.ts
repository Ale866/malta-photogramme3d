import type { AuthServices } from './ports';
import { badRequest } from '../../../shared/errors/applicationError';

export async function resolvePasswordResetToken(services: AuthServices, rawToken: string) {
  const token = rawToken.trim();
  if (!token) {
    throw badRequest('This password reset link is invalid', 'password_reset_token_invalid');
  }

  const tokenHash = services.hashPasswordResetToken(token);
  const passwordResetToken = await services.passwordResetTokens.findByTokenHash(tokenHash);

  if (!passwordResetToken || passwordResetToken.invalidatedAt) {
    throw badRequest('This password reset link is invalid', 'password_reset_token_invalid');
  }

  if (passwordResetToken.usedAt) {
    throw badRequest('This password reset link has already been used', 'password_reset_token_used');
  }

  if (passwordResetToken.expiresAt.getTime() < Date.now()) {
    throw badRequest('This password reset link has expired', 'password_reset_token_expired');
  }

  return passwordResetToken;
}
