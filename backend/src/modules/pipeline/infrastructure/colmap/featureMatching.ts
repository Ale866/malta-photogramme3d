import { config } from "../../../../shared/config/env";
import type { RunColmapStageHooks } from "../../application/ports";
import {
  CPU_THREAD_LIMIT,
  GPU_ENABLED,
  ensureDirectory,
  requireExistingFile,
  resolveOutputPaths,
  runStage,
  type StageCommand,
} from "../colmapRunner";

function buildFeatureMatchingCommand(outputFolder: string): StageCommand {
  const outputPaths = resolveOutputPaths(outputFolder);
  ensureDirectory(outputPaths.root);
  requireExistingFile(outputPaths.database, "COLMAP database_path");

  return {
    stage: "feature_matching",
    command: config.COLMAP_BIN,
    logLabel: "feature_matching",
    args: [
      "exhaustive_matcher",
      "--database_path", outputPaths.database,
      "--FeatureMatching.use_gpu", GPU_ENABLED,
      "--FeatureMatching.num_threads", CPU_THREAD_LIMIT,
    ],
  };
}

export function runFeatureMatching(outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  return runStage(buildFeatureMatchingCommand(outputFolder), hooks);
}
