import type { AuthServices } from './ports';
import { notFound, badRequest } from '../../../shared/errors/applicationError';
import { validatePasswordOrThrow } from './passwordPolicy';
import { resolvePasswordResetToken } from './resolvePasswordResetToken';

type ResetPasswordInput = {
  token: string;
  password: string;
  confirmPassword: string;
};

export async function resetPassword(services: AuthServices, input: ResetPasswordInput) {
  const passwordResetToken = await resolvePasswordResetToken(services, input.token);
  const password = input.password ?? '';
  const confirmPassword = input.confirmPassword ?? '';

  validatePasswordOrThrow(password);

  if (password !== confirmPassword) {
    throw badRequest('Passwords do not match', 'password_confirmation_mismatch');
  }

  const user = await services.users.findById(passwordResetToken.userId);
  if (!user) throw notFound('User not found', 'user_not_found');

  const passwordHash = await services.hashPassword(password);
  const now = new Date();

  await services.users.updatePassword(user.id, passwordHash);
  await services.passwordResetTokens.markUsed(passwordResetToken.id, now);
  await services.passwordResetTokens.invalidateActiveTokensForUser(user.id, now);
  await services.sessions.revokeAllForUser(user.id);

  return {
    message: 'Your password has been reset successfully.',
  };
}
