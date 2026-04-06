import { config } from "../../../../shared/config/env";
import type { RunColmapStageHooks } from "../../application/ports";
import {
  requireExistingDirectory,
  requireExistingFile,
  resolveOutputPaths,
  runStage,
  type StageCommand,
} from "../colmapRunner";

function buildDensifyCommand(outputFolder: string): StageCommand {
  const outputPaths = resolveOutputPaths(outputFolder);
  requireExistingDirectory(outputPaths.openmvsWorkspace);
  requireExistingFile(outputPaths.openmvsScene, "OpenMVS scene");

  return {
    stage: "meshing",
    command: config.OPENMVS_DENSIFY_POINT_CLOUD_BIN,
    logLabel: "densify",
    toolLabel: "OpenMVS",
    cwd: outputPaths.openmvsWorkspace,
    args: [
      "--working-folder", outputPaths.openmvsWorkspace,
      "--input-file", outputPaths.openmvsScene,
      "--output-file", outputPaths.openmvsSceneDense,
      "--archive-type", "-1",
      "--verbosity", "1",
    ],
  };
}

export async function runOpenMvsDensify(outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  const outputPaths = resolveOutputPaths(outputFolder);
  await runStage(buildDensifyCommand(outputFolder), hooks);
  requireExistingFile(outputPaths.openmvsSceneDense, "OpenMVS dense scene");
}
