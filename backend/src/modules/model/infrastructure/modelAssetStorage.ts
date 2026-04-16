import fs from "node:fs";
import path from "node:path";
import type { ModelAssetDelivery, ModelAssetStorage } from "../application/ports";
import {
  ensureCompressedMeshVariant,
  ensureWebpTextureVariant,
} from "../../../shared/infrastructure/modelAssetCompression";

const MODEL_MESH_PATH = path.join("dense", "textured", "mesh.ply");
const MODEL_GLB_PATH = path.join("dense", "textured", "model.glb");
const MODEL_TEXTURE_PATH = path.join("dense", "textured", "texture.png");
const MESH_CONTENT_TYPE = "application/octet-stream";
const GLB_CONTENT_TYPE = "model/gltf-binary";
const TEXTURE_CONTENT_TYPE = "image/png";
const WEBP_CONTENT_TYPE = "image/webp";

export const modelAssetStorage: ModelAssetStorage = {
  async resolveMeshDelivery(outputFolder: string, acceptEncodingHeader: string | string[] | undefined) {
    const glbPath = resolveExistingModelAssetPath(outputFolder, MODEL_GLB_PATH);
    if (glbPath) {
      return {
        path: glbPath,
        contentType: GLB_CONTENT_TYPE,
      };
    }

    const meshPath = resolveExistingModelAssetPath(outputFolder, MODEL_MESH_PATH);
    if (!meshPath) return null;

    const acceptEncoding = normalizeHeaderValue(acceptEncodingHeader);

    if (acceptEncoding.includes("br")) {
      const compressedMeshPath = await safelyResolveCompressedMeshVariant(meshPath, "br");
      if (compressedMeshPath) {
        return createMeshDelivery(compressedMeshPath, "br");
      }
    }

    if (acceptEncoding.includes("gzip")) {
      const compressedMeshPath = await safelyResolveCompressedMeshVariant(meshPath, "gzip");
      if (compressedMeshPath) {
        return createMeshDelivery(compressedMeshPath, "gzip");
      }
    }

    return createMeshDelivery(meshPath);
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

function createMeshDelivery(
  assetPath: string,
  contentEncoding?: "br" | "gzip",
): ModelAssetDelivery {
  return {
    path: assetPath,
    contentType: MESH_CONTENT_TYPE,
    contentEncoding,
    varyHeader: "Accept-Encoding",
  };
}

async function safelyResolveCompressedMeshVariant(
  meshPath: string,
  encoding: "br" | "gzip",
) {
  try {
    return await ensureCompressedMeshVariant(meshPath, encoding);
  } catch (error) {
    console.warn(`Failed to prepare ${encoding} mesh variant for ${meshPath}`, error);
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
