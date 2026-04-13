import fs from "fs";
import path from "path";
import { config } from "../../../../shared/config/env";
import { writeOptimizedModelAssetVariants } from "../../../../shared/infrastructure/modelAssetCompression";
import type { RunColmapStageHooks } from "../../application/ports";
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

function buildOpenMvsTexturingCommand(outputFolder: string): StageCommand {
  const outputPaths = resolveOutputPaths(outputFolder);
  requireExistingDirectory(outputPaths.openmvsWorkspace);
  // DensifyPointCloud disabled: use the base scene + mesh from ReconstructMesh.
  requireExistingFile(outputPaths.openmvsScene, "OpenMVS scene");
  requireExistingFile(outputPaths.openmvsSceneMeshPly, "OpenMVS mesh");

  return {
    stage: "texturing",
    command: config.OPENMVS_TEXTURE_MESH_BIN,
    logLabel: "texturing",
    toolLabel: "OpenMVS",
    cwd: outputPaths.openmvsWorkspace,
    args: [
      path.basename(outputPaths.openmvsScene),
      "-m", path.basename(outputPaths.openmvsSceneMeshPly),
      "-o", path.basename(outputPaths.openmvsSceneMeshTexture),
      "--decimate", "0.75",
      "--resolution-level", "1",
      "--max-threads", "1",
      "--max-texture-size", "4096",
    ],
  };
}

export async function runOpenMvsTexturing(outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  const outputPaths = resolveOutputPaths(outputFolder);
  const command = buildOpenMvsTexturingCommand(outputFolder);
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
  cleanupIntermediatePipelineOutputs(outputFolder);
}

async function publishFinalTexturedOutputs(outputPaths: ReturnType<typeof resolveOutputPaths>) {
  resetDirectory(outputPaths.denseTextured);
  ensureDirectory(outputPaths.denseTextured);

  const meshOutputPath = path.join(outputPaths.denseTextured, "mesh.ply");
  const textureOutputPath = path.join(outputPaths.denseTextured, "texture.png");

  fs.copyFileSync(outputPaths.openmvsSceneMeshTexturePly, meshOutputPath);
  fs.copyFileSync(outputPaths.openmvsSceneMeshTextureImage, textureOutputPath);

  try {
    await writeOptimizedModelAssetVariants(meshOutputPath, textureOutputPath);
  } catch (error) {
    console.warn("Failed to generate optimized model asset variants", error);
  }
}
