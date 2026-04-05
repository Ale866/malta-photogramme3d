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
      "scene_dense.mvs",
      "-p", "scene_dense.ply",
      "-o", "scene_dense_mesh.mvs",
      "--decimate", String(config.OPENMVS_RECONSTRUCT_MESH_DECIMATE),
    ],
  };
}

export async function runOpenMvsMeshing(outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  const outputPaths = resolveOutputPaths(outputFolder);
  await runStage(buildOpenMvsMeshingCommand(outputFolder), hooks);
  requireExistingFile(outputPaths.openmvsSceneDensePly, "OpenMVS dense point cloud");
  requireExistingFile(outputPaths.openmvsSceneDenseMeshPly, "OpenMVS mesh");
}
