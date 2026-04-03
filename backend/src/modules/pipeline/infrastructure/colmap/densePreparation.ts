import { config } from "../../../../shared/config/env";
import type { RunColmapStageHooks } from "../../application/ports";
import {
  ensureDirectoryHasFiles,
  requireExistingDirectory,
  resetDirectory,
  resolveImagePath,
  resolveOutputPaths,
  runStage,
  type StageCommand,
} from "../colmapRunner";

function buildDensePreparationCommand(inputFolder: string, outputFolder: string): StageCommand {
  const imagePath = resolveImagePath(inputFolder);
  const outputPaths = resolveOutputPaths(outputFolder);
  requireExistingDirectory(outputPaths.sparseModel);

  resetDirectory(outputPaths.denseWorkspace);

  return {
    stage: "dense_preparation",
    command: config.COLMAP_BIN,
    logLabel: "dense_preparation",
    args: [
      "image_undistorter",
      "--image_path", imagePath,
      "--input_path", outputPaths.sparseModel,
      "--output_path", outputPaths.denseWorkspace,
      "--output_type", "COLMAP",
    ],
  };
}

export function runDensePreparation(inputFolder: string, outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  return runStage(buildDensePreparationCommand(inputFolder, outputFolder), hooks).then(() => {
    const outputPaths = resolveOutputPaths(outputFolder);
    requireExistingDirectory(outputPaths.denseWorkspace);
    requireExistingDirectory(outputPaths.denseImages);
    ensureDirectoryHasFiles(outputPaths.denseSparse, "COLMAP dense sparse path");
  });
}
