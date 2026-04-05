import fs from "fs";
import path from "path";
import { config } from "../../../../shared/config/env";
import type { RunColmapStageHooks } from "../../application/ports";
import {
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
  requireExistingFile(outputPaths.openmvsSceneDense, "OpenMVS dense scene");
  requireExistingFile(outputPaths.openmvsSceneDenseMeshPly, "OpenMVS mesh");

  return {
    stage: "texturing",
    command: config.OPENMVS_TEXTURE_MESH_BIN,
    logLabel: "texturing",
    toolLabel: "OpenMVS",
    cwd: outputPaths.openmvsWorkspace,
    args: [
      "scene_dense.mvs",
      "-m", "scene_dense_mesh.ply",
      "-o", "scene_dense_mesh_texture.mvs",
    ],
  };
}

export async function runOpenMvsTexturing(outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  const outputPaths = resolveOutputPaths(outputFolder);
  await runStage(buildOpenMvsTexturingCommand(outputFolder), hooks);

  requireExistingFile(outputPaths.openmvsSceneDenseMeshTexturePly, "OpenMVS textured mesh");
  requireExistingFile(outputPaths.openmvsSceneDenseMeshTextureImage, "OpenMVS textured atlas");

  publishFinalTexturedOutputs(outputPaths);
}

function publishFinalTexturedOutputs(outputPaths: ReturnType<typeof resolveOutputPaths>) {
  resetDirectory(outputPaths.denseTextured);
  ensureDirectory(outputPaths.denseTextured);

  fs.copyFileSync(
    outputPaths.openmvsSceneDenseMeshTexturePly,
    path.join(outputPaths.denseTextured, "mesh.ply"),
  );
  fs.copyFileSync(
    outputPaths.openmvsSceneDenseMeshTextureImage,
    path.join(outputPaths.denseTextured, "texture.png"),
  );
}
