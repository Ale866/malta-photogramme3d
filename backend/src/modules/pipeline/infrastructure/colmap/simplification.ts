import { config } from "../../../../shared/config/env";
import type { RunColmapStageHooks } from "../../application/ports";
import {
  requireExistingDirectory,
  requireExistingFile,
  resolveOutputPaths,
  runStage,
  type StageCommand,
} from "../colmapRunner";

function buildSimplificationCommand(outputFolder: string): StageCommand {
  const outputPaths = resolveOutputPaths(outputFolder);
  requireExistingDirectory(outputPaths.denseWorkspace);
  requireExistingFile(outputPaths.denseMeshedPoisson, "COLMAP meshed point cloud");

  return {
    stage: "meshing",
    command: config.COLMAP_BIN,
    logLabel: "simplification",
    args: [
      "mesh_simplifier",
      "--input_path", outputPaths.denseMeshedPoisson,
      "--output_path", outputPaths.denseMeshedPoissonSimplified,
    ],
  };
}

export function runSimplification(outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  return runStage(buildSimplificationCommand(outputFolder), hooks).then(() => {
    const outputPaths = resolveOutputPaths(outputFolder);
    requireExistingFile(outputPaths.denseMeshedPoissonSimplified, "COLMAP simplified mesh");
  });
}
