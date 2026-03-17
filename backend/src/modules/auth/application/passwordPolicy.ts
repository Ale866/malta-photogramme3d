import { badRequest } from '../../../shared/errors/applicationError';

export const MIN_PASSWORD_LENGTH = 6;

export function validatePasswordOrThrow(password: string) {
  if (!password) throw badRequest('Password is required', 'password_required');
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw badRequest(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      'password_too_short'
    );
  }
}
