import type { AuthServices } from './ports';

type LogoutInput = {
  refreshToken: string;
};

export async function logout(services: AuthServices, input: LogoutInput) {
  const token = input.refreshToken;
  if (!token) return;

  const hash = services.hashRefreshToken(token);

  const session = await services.sessions.findByRefreshTokenHash(hash);
  if (!session) return;

  await services.sessions.revoke(session.id);
}