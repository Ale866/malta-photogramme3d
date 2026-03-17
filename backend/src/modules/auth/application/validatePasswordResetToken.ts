import type { AuthServices } from './ports';
import { resolvePasswordResetToken } from './resolvePasswordResetToken';

type ValidatePasswordResetTokenInput = {
  token: string;
};

export async function validatePasswordResetToken(
  services: AuthServices,
  input: ValidatePasswordResetTokenInput
) {
  const passwordResetToken = await resolvePasswordResetToken(services, input.token);

  return {
    expiresAt: passwordResetToken.expiresAt,
  };
}
