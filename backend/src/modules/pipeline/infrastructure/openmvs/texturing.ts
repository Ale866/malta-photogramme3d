import fs from "fs";
import path from "path";
import { config } from "../../../../shared/config/env";
import { writeOptimizedModelAssetVariants } from "../../../../shared/infrastructure/modelAssetCompression";
import type { RunColmapStageHooks } from "../../application/ports";
import { runOptionalGlbConversion } from "./glbConversion";
import {
  cleanupIntermediatePipelineOutputs,
  ensureDirectory,
  requireExistingDirectory,
  requireExistingFile,
  resetDirectory,
  resolveOutputPaths,
  runStage,
  type StageCommand,
} from "../colmapRunner";

function buildOpenMvsTexturingCommand(outputFolder: string, meshPath?: string): StageCommand {
  const outputPaths = resolveOutputPaths(outputFolder);
  requireExistingDirectory(outputPaths.openmvsWorkspace);
  // DensifyPointCloud disabled: use the base scene + mesh from ReconstructMesh.
  requireExistingFile(outputPaths.openmvsScene, "OpenMVS scene");
  const meshToTexture = requireExistingFile(meshPath ?? outputPaths.openmvsSceneMeshPly, "OpenMVS mesh");

  return {
    stage: "texturing",
    command: config.OPENMVS_TEXTURE_MESH_BIN,
    logLabel: "texturing",
    toolLabel: "OpenMVS",
    cwd: outputPaths.openmvsWorkspace,
    args: [
      path.basename(outputPaths.openmvsScene),
      "-m", path.basename(meshToTexture),
      "-o", path.basename(outputPaths.openmvsSceneMeshTexture),
      "--resolution-level", "0",
      "--max-threads", "1",
      "--max-texture-size", "4096",
    ],
  };
}

export async function runOpenMvsTexturing(outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  await runOpenMvsTexturingWithMesh(outputFolder, undefined, hooks);
}

export async function runOpenMvsTexturingWithMesh(
  outputFolder: string,
  meshPath?: string,
  hooks?: RunColmapStageHooks
): Promise<void> {
  const outputPaths = resolveOutputPaths(outputFolder);
  const command = buildOpenMvsTexturingCommand(outputFolder, meshPath);
  try {
    console.info(
      `[OpenMVS] TextureMesh command: ${command.command} ${command.args.join(" ")}`,
    );
    await runStage(command, hooks);
  } catch (error) {
    try {
      requireExistingFile(outputPaths.openmvsSceneMeshTexturePly, "OpenMVS textured mesh");
      requireExistingFile(outputPaths.openmvsSceneMeshTextureImage, "OpenMVS textured atlas");
    } catch {
      throw error;
    }
  }

  requireExistingFile(outputPaths.openmvsSceneMeshTexturePly, "OpenMVS textured mesh");
  requireExistingFile(outputPaths.openmvsSceneMeshTextureImage, "OpenMVS textured atlas");

  await publishFinalTexturedOutputs(outputPaths);
  await runOptionalGlbConversion(outputFolder);
  cleanupIntermediatePipelineOutputs(outputFolder);
}

async function publishFinalTexturedOutputs(outputPaths: ReturnType<typeof resolveOutputPaths>) {
  resetDirectory(outputPaths.denseTextured);
  ensureDirectory(outputPaths.denseTextured);

  const meshOutputPath = path.join(outputPaths.denseTextured, "mesh.ply");
  const textureOutputPath = path.join(outputPaths.denseTextured, "texture.png");

  fs.copyFileSync(outputPaths.openmvsSceneMeshTexturePly, meshOutputPath);
  const atlasFileNames = readReferencedTextureAtlases(meshOutputPath, path.basename(outputPaths.openmvsSceneMeshTextureImage));

  for (const atlasFileName of atlasFileNames) {
    const sourceAtlasPath = path.join(outputPaths.openmvsWorkspace, atlasFileName);
    requireExistingFile(sourceAtlasPath, `OpenMVS textured atlas ${atlasFileName}`);
    fs.copyFileSync(sourceAtlasPath, path.join(outputPaths.denseTextured, atlasFileName));
  }

  const primaryAtlasPath = path.join(outputPaths.denseTextured, atlasFileNames[0] ?? path.basename(outputPaths.openmvsSceneMeshTextureImage));
  requireExistingFile(primaryAtlasPath, "OpenMVS primary textured atlas");
  fs.copyFileSync(primaryAtlasPath, textureOutputPath);

  try {
    await writeOptimizedModelAssetVariants(meshOutputPath, textureOutputPath);
  } catch (error) {
    console.warn("Failed to generate optimized model asset variants", error);
  }
}

function readReferencedTextureAtlases(meshPath: string, fallbackAtlasFileName: string): string[] {
  const meshContents = fs.readFileSync(meshPath, "utf8");
  const atlasFileNames = meshContents
    .split(/\r?\n/)
    .map((line) => line.match(/^comment\s+TextureFile\s+(.+)$/u)?.[1]?.trim() ?? "")
    .filter((fileName) => fileName.length > 0);

  const uniqueAtlasFileNames = [...new Set(atlasFileNames)];
  if (uniqueAtlasFileNames.length > 0) {
    console.info(`[OpenMVS] Publishing referenced texture atlases: ${uniqueAtlasFileNames.join(", ")}`);
    return uniqueAtlasFileNames;
  }

  console.warn(
    `[OpenMVS] No TextureFile comments found in ${meshPath}; falling back to ${fallbackAtlasFileName}`
  );
  return [fallbackAtlasFileName];
}
