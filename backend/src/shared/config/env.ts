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

function parsePositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (typeof value !== 'string' || value.trim() === '') return fallback;
  return value.trim().toLowerCase() === 'true';
}

const BACKEND_ROOT = path.resolve(__dirname, "../../..");

function resolveConfiguredPath(name: string, targetPath: string) {
  const normalized = targetPath.trim();
  if (!normalized) {
    throw new Error(`${name} cannot be empty`);
  }

  if (path.isAbsolute(normalized)) {
    return normalized;
  }

  return path.resolve(BACKEND_ROOT, normalized);
}

function resolveColmapExecutable(value: string | undefined) {
  const configured = value?.trim();
  if (!configured) return "colmap";
  return configured;
}

function resolveOpenMvsExecutable(value: string | undefined, fallback: string) {
  const configured = value?.trim();
  if (!configured) return fallback;
  return configured;
}

function resolveFfmpegExecutable(value: string | undefined) {
  const configured = value?.trim();
  if (!configured) return "ffmpeg";
  return configured;
}

function resolveOptionalExecutable(value: string | undefined) {
  const configured = value?.trim();
  return configured ? configured : null;
}

export const config = {
  BACKEND_ROOT,
  PORT: Number(process.env.PORT ?? 3000),
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  APP_BASE_URL: process.env.APP_BASE_URL ?? process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',

  UPLOAD_DIR: resolveConfiguredPath("UPLOAD_DIR", process.env.UPLOAD_DIR ?? 'uploads'),
  OUTPUT_DIR: resolveConfiguredPath("OUTPUT_DIR", process.env.OUTPUT_DIR ?? 'output'),
  UPLOAD_TMP: resolveConfiguredPath("UPLOAD_TMP", process.env.UPLOAD_TMP ?? path.join('uploads', 'tmp')),
  COLMAP_BIN: resolveColmapExecutable(process.env.COLMAP_BIN),
  OPENMVS_INTERFACE_COLMAP_BIN: resolveOpenMvsExecutable(process.env.OPENMVS_INTERFACE_COLMAP_BIN, 'InterfaceCOLMAP'),
  OPENMVS_DENSIFY_POINT_CLOUD_BIN: resolveOpenMvsExecutable(process.env.OPENMVS_DENSIFY_POINT_CLOUD_BIN, 'DensifyPointCloud'),
  OPENMVS_RECONSTRUCT_MESH_BIN: resolveOpenMvsExecutable(process.env.OPENMVS_RECONSTRUCT_MESH_BIN, 'ReconstructMesh'),
  OPENMVS_RECONSTRUCT_MESH_DECIMATE: parsePositiveNumber(process.env.OPENMVS_RECONSTRUCT_MESH_DECIMATE, 1),
  OPENMVS_TEXTURE_MESH_BIN: resolveOpenMvsExecutable(process.env.OPENMVS_TEXTURE_MESH_BIN, 'TextureMesh'),
  BLENDER_BIN: resolveOptionalExecutable(process.env.BLENDER_BIN),
  GLB_CONVERSION_TIMEOUT_MS: parsePositiveInteger(process.env.GLB_CONVERSION_TIMEOUT_MS, 5 * 60 * 1000),
  FFMPEG_BIN: resolveFfmpegExecutable(process.env.FFMPEG_BIN),

  MONGODB_URI: requireEnv('MONGODB_URI'),

  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET'),
  JWT_ACCESS_TTL: requireEnv('JWT_ACCESS_TTL'),
  JWT_REFRESH_TTL: requireEnv('JWT_REFRESH_TTL'),
  PASSWORD_RESET_TOKEN_TTL_MINUTES: parsePositiveInteger(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES, 60),
  SMTP_HOST: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  SMTP_PORT: parsePositiveInteger(process.env.SMTP_PORT, 465),
  SMTP_SECURE: parseBoolean(process.env.SMTP_SECURE, true),
  SMTP_USER: process.env.SMTP_USER ?? '',
  SMTP_PASS: process.env.SMTP_PASS ?? '',
  MAIL_FROM: process.env.MAIL_FROM ?? '',
};
