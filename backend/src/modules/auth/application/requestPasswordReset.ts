import type { AuthServices } from './ports';
import { config } from '../../../shared/config/env';
import { badRequest } from '../../../shared/errors/applicationError';

type RequestPasswordResetInput = {
  email: string;
};

const GENERIC_PASSWORD_RESET_MESSAGE =
  'If an account with that email exists, we sent a password reset link.';

function buildPasswordResetLink(token: string) {
  const url = new URL('/reset-password', config.APP_BASE_URL);
  url.searchParams.set('token', token);
  return url.toString();
}

export async function requestPasswordReset(
  services: AuthServices,
  input: RequestPasswordResetInput
) {
  const email = input.email?.trim().toLowerCase() ?? '';
  if (!email) throw badRequest('Email is required', 'email_required');

  const user = await services.users.findByEmail(email);
  if (!user) {
    return { message: GENERIC_PASSWORD_RESET_MESSAGE };
  }

  const now = new Date();
  const rawToken = services.generatePasswordResetToken();
  const tokenHash = services.hashPasswordResetToken(rawToken);
  const expiresAt = new Date(
    now.getTime() + config.PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000
  );

  await services.passwordResetTokens.invalidateActiveTokensForUser(user.id, now);

  const passwordResetToken = await services.passwordResetTokens.create({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  try {
    await services.authEmailService.sendPasswordResetEmail({
      to: user.email,
      nickname: user.nickname,
      resetLink: buildPasswordResetLink(rawToken),
      expiresInMinutes: config.PASSWORD_RESET_TOKEN_TTL_MINUTES,
    });
  } catch (error) {
    await services.passwordResetTokens.invalidate(passwordResetToken.id, new Date());
    console.error('Failed to send password reset email', {
      userId: user.id,
      email: user.email,
      reason: error instanceof Error ? error.message : 'unknown_error',
    });
  }

  return { message: GENERIC_PASSWORD_RESET_MESSAGE };
}
