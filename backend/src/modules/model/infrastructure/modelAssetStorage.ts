import fs from "node:fs";
import path from "node:path";
import { ensureCompressedMeshVariant, ensureWebpTextureVariant } from "../../../shared/infrastructure/modelAssetCompression";
import type { ModelAssetDelivery, ModelAssetStorage, ModelMeshVariant } from "../application/ports";

const MODEL_MESH_PATH = path.join("dense", "textured", "mesh.ply");
const MODEL_GLB_PATH = path.join("dense", "textured", "model.glb");
const MODEL_MOBILE_GLB_PATH = path.join("dense", "textured", "model.mobile.glb");
const MODEL_TEXTURE_PATH = path.join("dense", "textured", "texture.png");
const MESH_CONTENT_TYPE = "application/octet-stream";
const GLB_CONTENT_TYPE = "model/gltf-binary";
const TEXTURE_CONTENT_TYPE = "image/png";
const WEBP_CONTENT_TYPE = "image/webp";

export const modelAssetStorage: ModelAssetStorage = {
  async resolveMeshDelivery(
    outputFolder: string,
    acceptEncodingHeader: string | string[] | undefined,
    variant: ModelMeshVariant,
  ) {
    const glbPath = resolvePreferredGlbPath(outputFolder, variant);
    if (glbPath) {
      return resolveCompressedBinaryDelivery(glbPath, GLB_CONTENT_TYPE, acceptEncodingHeader);
    }

    const meshPath = resolveExistingModelAssetPath(outputFolder, MODEL_MESH_PATH);
    if (!meshPath) return null;

    return resolveCompressedBinaryDelivery(meshPath, MESH_CONTENT_TYPE, acceptEncodingHeader);
  },
  async resolveTextureDelivery(outputFolder: string, acceptHeader: string | string[] | undefined) {
    const texturePath = resolveExistingModelAssetPath(outputFolder, MODEL_TEXTURE_PATH);
    if (!texturePath) return null;

    const accept = normalizeHeaderValue(acceptHeader);
    if (accept.includes("image/webp")) {
      const webpTexturePath = await safelyResolveWebpTextureVariant(texturePath);
      if (webpTexturePath) {
        return {
          path: webpTexturePath,
          contentType: WEBP_CONTENT_TYPE,
          varyHeader: "Accept",
        };
      }
    }

    return {
      path: texturePath,
      contentType: TEXTURE_CONTENT_TYPE,
      varyHeader: "Accept",
    };
  },
};

function resolveExistingModelAssetPath(outputFolder: string, relativePath: string) {
  const absolutePath = path.join(outputFolder, relativePath);
  return fs.existsSync(absolutePath) ? absolutePath : null;
}

function resolvePreferredGlbPath(outputFolder: string, variant: ModelMeshVariant) {
  if (variant === "mobile") {
    return (
      resolveExistingModelAssetPath(outputFolder, MODEL_MOBILE_GLB_PATH)
      ?? resolveExistingModelAssetPath(outputFolder, MODEL_GLB_PATH)
    );
  }

  return resolveExistingModelAssetPath(outputFolder, MODEL_GLB_PATH);
}

async function resolveCompressedBinaryDelivery(
  assetPath: string,
  contentType: string,
  acceptEncodingHeader: string | string[] | undefined,
): Promise<ModelAssetDelivery> {
  const acceptEncoding = normalizeHeaderValue(acceptEncodingHeader);

  if (acceptEncoding.includes("br")) {
    const compressedAssetPath = await safelyResolveCompressedAssetVariant(assetPath, "br");
    if (compressedAssetPath) {
      return createBinaryDelivery(compressedAssetPath, contentType, "br");
    }
  }

  if (acceptEncoding.includes("gzip")) {
    const compressedAssetPath = await safelyResolveCompressedAssetVariant(assetPath, "gzip");
    if (compressedAssetPath) {
      return createBinaryDelivery(compressedAssetPath, contentType, "gzip");
    }
  }

  return createBinaryDelivery(assetPath, contentType);
}

function createBinaryDelivery(
  assetPath: string,
  contentType: string,
  contentEncoding?: "br" | "gzip",
): ModelAssetDelivery {
  return {
    path: assetPath,
    contentType,
    contentEncoding,
    varyHeader: "Accept-Encoding",
  };
}

async function safelyResolveCompressedAssetVariant(assetPath: string, encoding: "br" | "gzip") {
  try {
    return await ensureCompressedMeshVariant(assetPath, encoding);
  } catch (error) {
    console.warn(`Failed to prepare ${encoding} compressed variant for ${assetPath}`, error);
    return null;
  }
}

async function safelyResolveWebpTextureVariant(texturePath: string) {
  try {
    return await ensureWebpTextureVariant(texturePath);
  } catch (error) {
    console.warn(`Failed to prepare webp texture variant for ${texturePath}`, error);
    return null;
  }
}

function normalizeHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.join(",").toLowerCase();
  }

  return (value ?? "").toLowerCase();
}
