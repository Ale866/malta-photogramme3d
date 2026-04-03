import fs from "fs";
import { config } from "../../../../shared/config/env";
import type { PipelineProfile, RunColmapStageHooks } from "../../application/ports";
import {
  ensureDirectory,
  requireExistingFile,
  resolveImagePath,
  resolveOutputPaths,
  runStage,
  type StageCommand,
} from "../colmapRunner";

function buildStrictSparseMappingCommand(inputFolder: string, outputFolder: string): StageCommand {
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

function buildRelaxedSparseMappingCommand(inputFolder: string, outputFolder: string): StageCommand {
  const command = buildStrictSparseMappingCommand(inputFolder, outputFolder);

  return {
    ...command,
    args: [
      ...command.args,
      "--Mapper.init_min_num_inliers", "50",
      "--Mapper.init_min_tri_angle", "8",
      "--Mapper.abs_pose_min_num_inliers", "20",
      "--Mapper.abs_pose_min_inlier_ratio", "0.15",
      "--Mapper.filter_min_tri_angle", "1.0",
    ],
  };
}

export function runSparseMapping(inputFolder: string, outputFolder: string, hooks?: RunColmapStageHooks, profile: PipelineProfile = "strict"
): Promise<void> {
  const command = profile === "relaxed"
    ? buildRelaxedSparseMappingCommand(inputFolder, outputFolder)
    : buildStrictSparseMappingCommand(inputFolder, outputFolder);

  return runStage(command, hooks).then(() => {
    const outputPaths = resolveOutputPaths(outputFolder);
    if (!fs.existsSync(outputPaths.sparseModel)) {
      throw new Error(`COLMAP sparse mapping did not produce the expected output at ${outputPaths.sparseModel}`);
    }
  });
}
