import { config } from "../../../../shared/config/env";
import type { RunColmapStageHooks } from "../../application/ports";
import {
  ensureDirectoryHasFiles,
  requireExistingDirectory,
  requireExistingFile,
  resetDirectory,
  resolveOutputPaths,
  runStage,
  type StageCommand,
} from "../colmapRunner";

function buildTexturingCommand(outputFolder: string): StageCommand {
  const outputPaths = resolveOutputPaths(outputFolder);
  requireExistingDirectory(outputPaths.denseWorkspace);
  requireExistingDirectory(outputPaths.denseImages);
  requireExistingDirectory(outputPaths.denseSparse);
  requireExistingFile(outputPaths.denseMeshedPoissonSimplified, "COLMAP simplified mesh");

  resetDirectory(outputPaths.denseTextured);

  return {
    stage: "texturing",
    command: config.COLMAP_BIN,
    logLabel: "texturing",
    args: [
      "mesh_texturer",
      "--input_path", outputPaths.denseMeshedPoissonSimplified,
      "--output_path", outputPaths.denseTextured,
      "--workspace_path", outputPaths.denseWorkspace,
      "--workspace_format", "COLMAP",
    ],
  };
}

export function runTexturing(outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  return runStage(buildTexturingCommand(outputFolder), hooks).then(() => {
    const outputPaths = resolveOutputPaths(outputFolder);
    ensureDirectoryHasFiles(outputPaths.denseTextured, "COLMAP textured mesh output");
  });
}
