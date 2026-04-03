import { config } from "../../../../shared/config/env";
import type { RunColmapStageHooks } from "../../application/ports";
import {
  CPU_THREAD_LIMIT,
  GPU_ENABLED,
  ensureDirectory,
  resolveImagePath,
  resolveOutputPaths,
  runStage,
  type StageCommand,
} from "../colmapRunner";

function buildFeatureExtractionCommand(inputFolder: string, outputFolder: string): StageCommand {
  const imagePath = resolveImagePath(inputFolder);
  const outputPaths = resolveOutputPaths(outputFolder);
  ensureDirectory(outputPaths.root);

  return {
    stage: "feature_extraction",
    command: config.COLMAP_BIN,
    logLabel: "feature_extraction",
    args: [
      "feature_extractor",
      "--database_path", outputPaths.database,
      "--image_path", imagePath,
      "--FeatureExtraction.use_gpu", GPU_ENABLED,
      "--FeatureExtraction.num_threads", CPU_THREAD_LIMIT,
    ],
  };
}

export function runFeatureExtraction(inputFolder: string, outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  return runStage(buildFeatureExtractionCommand(inputFolder, outputFolder), hooks);
}
