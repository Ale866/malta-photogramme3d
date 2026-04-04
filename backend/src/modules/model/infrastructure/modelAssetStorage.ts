import fs from "node:fs";
import path from "node:path";

const MODEL_MESH_PATH = path.join("dense", "textured", "mesh.ply");

const MODEL_TEXTURE_PATH = path.join("dense", "textured", "texture.png");

export const modelAssetStorage = {
  resolveMeshPath(outputFolder: string) {
    return resolveExistingModelAssetPath(outputFolder, MODEL_MESH_PATH);
  },
  resolveTexturePath(outputFolder: string) {
    return resolveExistingModelAssetPath(outputFolder, MODEL_TEXTURE_PATH);
  },
};

function resolveExistingModelAssetPath(outputFolder: string, relativePath: string) {
  const absolutePath = path.join(outputFolder, relativePath);
  return fs.existsSync(absolutePath) ? absolutePath : null;
}
