import { config } from "../../../../shared/config/env";
import type { RunColmapStageHooks } from "../../application/ports";
import {
  ensureDirectory,
  ensureDirectoryHasFiles,
  MIN_FUSED_POINT_COUNT_FOR_MESHING,
  readPlyVertexCount,
  requireExistingDirectory,
  requireExistingFile,
  resetDirectory,
  resolveOutputPaths,
  runStage,
  type StageCommand,
} from "../colmapRunner";

function buildInterfaceImportCommand(outputFolder: string): StageCommand {
  const outputPaths = resolveOutputPaths(outputFolder);
  requireExistingDirectory(outputPaths.denseWorkspace);
  requireExistingDirectory(outputPaths.denseImages);
  requireExistingDirectory(outputPaths.denseSparse);
  ensureDirectoryHasFiles(outputPaths.denseImages, "COLMAP dense images");
  requireExistingFile(outputPaths.denseFused, "COLMAP fused point cloud");

  resetDirectory(outputPaths.openmvsWorkspace);

  return {
    stage: "meshing",
    command: config.OPENMVS_INTERFACE_COLMAP_BIN,
    logLabel: "interface",
    toolLabel: "OpenMVS",
    cwd: outputPaths.openmvsWorkspace,
    args: [
      "-i", outputPaths.denseWorkspace,
      "-o", outputPaths.openmvsScene,
      "--image-folder", outputPaths.denseImages,
    ],
  };
}

export async function runOpenMvsInterface(outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  const outputPaths = resolveOutputPaths(outputFolder);
  const fusedPointCount = readPlyVertexCount(outputPaths.denseFused, "COLMAP fused point cloud");

  if (fusedPointCount < MIN_FUSED_POINT_COUNT_FOR_MESHING) {
    throw new Error(
      `Too few points were reconstructed (${fusedPointCount}) to build a mesh. The uploaded images did not produce a dense enough point cloud for mesh reconstruction. Try again taking a more complete dataset with more images and/or better coverage of the scene.`
    );
  }

  ensureDirectory(outputPaths.openmvsWorkspace);
  await runStage(buildInterfaceImportCommand(outputFolder), hooks);
  requireExistingFile(outputPaths.openmvsScene, "OpenMVS scene");
}
