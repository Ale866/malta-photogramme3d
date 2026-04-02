import 'dotenv/config';
import path from "path";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (typeof value !== 'string' || value.trim() === '') return fallback;
  return value.trim().toLowerCase() === 'true';
}

const BACKEND_ROOT = path.resolve(__dirname, "../../..");

function resolveBackendPath(targetPath: string) {
  return path.resolve(BACKEND_ROOT, targetPath);
}

export const config = {
  BACKEND_ROOT,
  PORT: Number(process.env.PORT ?? 3000),
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  APP_BASE_URL: process.env.APP_BASE_URL ?? process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',

  UPLOAD_DIR: resolveBackendPath(process.env.UPLOAD_DIR ?? 'uploads'),
  OUTPUT_DIR: resolveBackendPath(process.env.OUTPUT_DIR ?? 'output'),
  UPLOAD_TMP: resolveBackendPath(process.env.UPLOAD_TMP ?? path.join('uploads', 'tmp')),

  MONGODB_URI: requireEnv('MONGODB_URI'),

  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET'),
  JWT_ACCESS_TTL: requireEnv('JWT_ACCESS_TTL'),
  JWT_REFRESH_TTL: requireEnv('JWT_REFRESH_TTL'),
  PASSWORD_RESET_TOKEN_TTL_MINUTES: parsePositiveInteger(
    process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES,
    60
  ),
  SMTP_HOST: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  SMTP_PORT: parsePositiveInteger(process.env.SMTP_PORT, 465),
  SMTP_SECURE: parseBoolean(process.env.SMTP_SECURE, true),
  SMTP_USER: process.env.SMTP_USER ?? '',
  SMTP_PASS: process.env.SMTP_PASS ?? '',
  MAIL_FROM: process.env.MAIL_FROM ?? '',
};
