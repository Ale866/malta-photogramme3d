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
  requireExistingFile(outputPaths.openmvsSceneDense, "OpenMVS dense scene");

  return {
    stage: "meshing",
    command: config.OPENMVS_RECONSTRUCT_MESH_BIN,
    logLabel: "meshing",
    toolLabel: "OpenMVS",
    cwd: outputPaths.openmvsWorkspace,
    args: [
      path.basename(outputPaths.openmvsSceneDense),
      "-p", path.basename(outputPaths.openmvsSceneDensePly),
      "-o", path.basename(outputPaths.openmvsSceneDenseMesh),
    ],
  };
}

export async function runOpenMvsMeshing(outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  const outputPaths = resolveOutputPaths(outputFolder);
  try {
    await runStage(buildOpenMvsMeshingCommand(outputFolder), hooks);
  } catch (error) {
    try {
      requireExistingFile(outputPaths.openmvsSceneDenseMeshPly, "OpenMVS dense mesh");
    } catch {
      throw error;
    }
  }

  requireExistingFile(outputPaths.openmvsSceneDenseMeshPly, "OpenMVS dense mesh");
}
