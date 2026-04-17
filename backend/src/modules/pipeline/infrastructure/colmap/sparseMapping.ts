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

type SparseMappingOptions = {
  initMinNumInliers: string;
  initMinTriAngle: string;
  absPoseMinNumInliers: string;
  absPoseMinInlierRatio: string;
  filterMinTriAngle: string;
};

function buildSparseMappingCommand(
  inputFolder: string,
  outputFolder: string,
  options: SparseMappingOptions,
): StageCommand {
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
      "--Mapper.init_min_num_inliers", options.initMinNumInliers,
      "--Mapper.init_min_tri_angle", options.initMinTriAngle,
      "--Mapper.abs_pose_min_num_inliers", options.absPoseMinNumInliers,
      "--Mapper.abs_pose_min_inlier_ratio", options.absPoseMinInlierRatio,
      "--Mapper.filter_min_tri_angle", options.filterMinTriAngle,
    ],
  };
}

function buildStrictSparseMappingCommand(inputFolder: string, outputFolder: string): StageCommand {
  return buildSparseMappingCommand(inputFolder, outputFolder, {
    initMinNumInliers: "120",
    initMinTriAngle: "12",
    absPoseMinNumInliers: "40",
    absPoseMinInlierRatio: "0.25",
    filterMinTriAngle: "2.5",
  });
}

function buildRelaxedSparseMappingCommand(inputFolder: string, outputFolder: string): StageCommand {
  return buildSparseMappingCommand(inputFolder, outputFolder, {
    initMinNumInliers: "50",
    initMinTriAngle: "8",
    absPoseMinNumInliers: "20",
    absPoseMinInlierRatio: "0.15",
    filterMinTriAngle: "1.0",
  });
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
