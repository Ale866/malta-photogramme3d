import path from "path";
import { config } from "../../../../shared/config/env";
import type { RunColmapStageHooks } from "../../application/ports";
import {
  requireExistingDirectory,
  requireExistingFile,
  resolveOutputPaths,
  runStage,
  type StageCommand,
} from "../colmapRunner";

function buildOpenMvsMeshingCommand(outputFolder: string): StageCommand {
  const outputPaths = resolveOutputPaths(outputFolder);
  requireExistingDirectory(outputPaths.openmvsWorkspace);
  // DensifyPointCloud disabled: use the base scene from InterfaceCOLMAP.
  requireExistingFile(outputPaths.openmvsScene, "OpenMVS scene");

  return {
    stage: "meshing",
    command: config.OPENMVS_RECONSTRUCT_MESH_BIN,
    logLabel: "meshing",
    toolLabel: "OpenMVS",
    cwd: outputPaths.openmvsWorkspace,
    args: [
      path.basename(outputPaths.openmvsScene),
      "-p", path.basename(outputPaths.openmvsSceneMeshPly),
      "-o", path.basename(outputPaths.openmvsSceneMesh),
    ],
  };
}

export async function runOpenMvsMeshing(outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  const outputPaths = resolveOutputPaths(outputFolder);
  try {
    await runStage(buildOpenMvsMeshingCommand(outputFolder), hooks);
  } catch (error) {
    try {
      requireExistingFile(outputPaths.openmvsSceneMeshPly, "OpenMVS mesh");
    } catch {
      throw error;
    }
  }

  requireExistingFile(outputPaths.openmvsSceneMeshPly, "OpenMVS mesh");
}
