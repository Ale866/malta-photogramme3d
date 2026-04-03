import fs from "fs";
import { config } from "../../../../shared/config/env";
import type { RunColmapStageHooks } from "../../application/ports";
import {
  ensureDirectory,
  requireExistingFile,
  resolveImagePath,
  resolveOutputPaths,
  runStage,
  type StageCommand,
} from "../colmapRunner";

function buildSparseMappingCommand(inputFolder: string, outputFolder: string): StageCommand {
  const imagePath = resolveImagePath(inputFolder);
  const outputPaths = resolveOutputPaths(outputFolder);
  requireExistingFile(outputPaths.database, "COLMAP database_path");

  ensureDirectory(outputPaths.sparseRoot);

  return {
    stage: "sparse_mapping",
    command: config.COLMAP_BIN,
    logLabel: "sparse_mapping",
    args: [
      "mapper",
      "--database_path", outputPaths.database,
      "--image_path", imagePath,
      "--output_path", outputPaths.sparseRoot,
    ],
  };
}

export function runSparseMapping(inputFolder: string, outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  return runStage(buildSparseMappingCommand(inputFolder, outputFolder), hooks).then(() => {
    const outputPaths = resolveOutputPaths(outputFolder);
    if (!fs.existsSync(outputPaths.sparseModel)) {
      throw new Error(`COLMAP sparse mapping did not produce the expected output at ${outputPaths.sparseModel}`);
    }
  });
}
