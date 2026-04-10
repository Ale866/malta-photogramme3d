import fs from "node:fs";
import { promisify } from "node:util";
import { brotliCompress, gzip } from "node:zlib";
import sharp from "sharp";

const brotliCompressAsync = promisify(brotliCompress);
const gzipAsync = promisify(gzip);

export async function writeOptimizedModelAssetVariants(meshPath: string, texturePath: string) {
  await Promise.all([
    ensureCompressedMeshVariant(meshPath, "br"),
    ensureCompressedMeshVariant(meshPath, "gzip"),
    ensureWebpTextureVariant(texturePath),
  ]);
}

export async function ensureCompressedMeshVariant(meshPath: string, encoding: "br" | "gzip") {
  const variantPath = getCompressedMeshVariantPath(meshPath, encoding);
  if (fs.existsSync(variantPath)) {
    return variantPath;
  }

  const meshBuffer = await fs.promises.readFile(meshPath);
  const compressedBuffer = encoding === "br" ? await brotliCompressAsync(meshBuffer) : await gzipAsync(meshBuffer);

  await fs.promises.writeFile(variantPath, compressedBuffer);
  return variantPath;
}

export async function ensureWebpTextureVariant(texturePath: string) {
  const variantPath = getWebpTextureVariantPath(texturePath);
  if (fs.existsSync(variantPath)) {
    return variantPath;
  }

  const webpBuffer = await sharp(texturePath)
    .webp({ lossless: true, effort: 6 })
    .toBuffer();

  await fs.promises.writeFile(variantPath, webpBuffer);
  return variantPath;
}

export function getCompressedMeshVariantPath(meshPath: string, encoding: "br" | "gzip") {
  return `${meshPath}.${encoding === "br" ? "br" : "gz"}`;
}

export function getWebpTextureVariantPath(texturePath: string) {
  return texturePath.replace(/\.[^.]+$/u, ".webp");
}
