import fs from "fs";
import path from "path";
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
    const selectedSparseModel = selectLargestSparseModel(outputPaths.sparseRoot);

    if (selectedSparseModel && path.resolve(selectedSparseModel) !== path.resolve(outputPaths.sparseModel)) {
      console.info(
        `[COLMAP sparse_mapping] Promoting ${path.basename(selectedSparseModel)} to sparse/0 for dense reconstruction`
      );
      replaceSparseModel(outputPaths.sparseModel, selectedSparseModel);
    }

    if (!fs.existsSync(outputPaths.sparseModel)) {
      throw new Error(`COLMAP sparse mapping did not produce the expected output at ${outputPaths.sparseModel}`);
    }
  });
}

function selectLargestSparseModel(sparseRoot: string): string | null {
  if (!fs.existsSync(sparseRoot)) return null;

  const candidates = fs.readdirSync(sparseRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const modelPath = path.join(sparseRoot, entry.name);
      return {
        imageCount: readSparseModelImageCount(modelPath),
        modelPath,
      };
    })
    .filter((candidate) => candidate.imageCount > 0)
    .sort((left, right) => right.imageCount - left.imageCount);

  if (candidates.length > 0) {
    console.info(
      `[COLMAP sparse_mapping] Sparse model image counts: ${candidates
        .map((candidate) => `${path.basename(candidate.modelPath)}=${candidate.imageCount}`)
        .join(", ")}`
    );
  }

  return candidates[0]?.modelPath ?? null;
}

function readSparseModelImageCount(modelPath: string): number {
  const imagesBinPath = path.join(modelPath, "images.bin");
  if (fs.existsSync(imagesBinPath)) {
    const file = fs.openSync(imagesBinPath, "r");
    try {
      const buffer = Buffer.alloc(8);
      const bytesRead = fs.readSync(file, buffer, 0, buffer.length, 0);
      if (bytesRead === buffer.length) {
        return Number(buffer.readBigUInt64LE(0));
      }
    } finally {
      fs.closeSync(file);
    }
  }

  const imagesTxtPath = path.join(modelPath, "images.txt");
  if (!fs.existsSync(imagesTxtPath)) return 0;

  const dataLines = fs.readFileSync(imagesTxtPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  return Math.floor(dataLines.length / 2);
}

function replaceSparseModel(targetPath: string, sourcePath: string) {
  fs.rmSync(targetPath, { recursive: true, force: true });
  fs.cpSync(sourcePath, targetPath, { recursive: true });
}
