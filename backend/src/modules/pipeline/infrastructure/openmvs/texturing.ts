import fs from "fs";
import path from "path";
import { config } from "../../../../shared/config/env";
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
  requireExistingFile(outputPaths.openmvsScene, "OpenMVS scene");
  requireExistingFile(outputPaths.openmvsSceneMeshPly, "OpenMVS mesh");

  return {
    stage: "texturing",
    command: config.OPENMVS_TEXTURE_MESH_BIN,
    logLabel: "texturing",
    toolLabel: "OpenMVS",
    cwd: outputPaths.openmvsWorkspace,
    args: [
      "scene.mvs",
      "-m", "scene_mesh.ply",
      "-o", "scene_mesh_texture.mvs",
    ],
  };
}

export async function runOpenMvsTexturing(outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  const outputPaths = resolveOutputPaths(outputFolder);
  try {
    await runStage(buildOpenMvsTexturingCommand(outputFolder), hooks);
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

  publishFinalTexturedOutputs(outputPaths);
  cleanupIntermediatePipelineOutputs(outputFolder);
}

function publishFinalTexturedOutputs(outputPaths: ReturnType<typeof resolveOutputPaths>) {
  resetDirectory(outputPaths.denseTextured);
  ensureDirectory(outputPaths.denseTextured);

  fs.copyFileSync(
    outputPaths.openmvsSceneMeshTexturePly,
    path.join(outputPaths.denseTextured, "mesh.ply"),
  );
  fs.copyFileSync(
    outputPaths.openmvsSceneMeshTextureImage,
    path.join(outputPaths.denseTextured, "texture.png"),
  );
}
