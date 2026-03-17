import 'dotenv/config';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  PORT: Number(process.env.PORT ?? 3000),
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  APP_BASE_URL: process.env.APP_BASE_URL ?? process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',

  OUTPUT_DIR: process.env.OUTPUT_DIR ?? 'output',
  UPLOAD_TMP: process.env.UPLOAD_TMP ?? 'uploads/tmp',

  MONGODB_URI: requireEnv('MONGODB_URI'),

  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET'),
  JWT_ACCESS_TTL: requireEnv('JWT_ACCESS_TTL'),
  JWT_REFRESH_TTL: requireEnv('JWT_REFRESH_TTL'),
  PASSWORD_RESET_TOKEN_TTL_MINUTES: parsePositiveInteger(
    process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES,
    60
  ),
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? '',
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL ?? '',
  RESEND_FROM_NAME: process.env.RESEND_FROM_NAME ?? '',
};
