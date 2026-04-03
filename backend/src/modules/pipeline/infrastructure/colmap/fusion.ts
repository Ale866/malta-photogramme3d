import { config } from "../../../../shared/config/env";
import type { RunColmapStageHooks } from "../../application/ports";
import {
  ensureDirectoryHasFiles,
  requireExistingDirectory,
  requireExistingFile,
  resolveOutputPaths,
  runStage,
  type StageCommand,
} from "../colmapRunner";

function buildFusionCommand(outputFolder: string): StageCommand {
  const outputPaths = resolveOutputPaths(outputFolder);
  requireExistingDirectory(outputPaths.denseWorkspace);
  requireExistingDirectory(outputPaths.denseImages);
  requireExistingDirectory(outputPaths.denseStereo);
  ensureDirectoryHasFiles(outputPaths.denseDepthMaps, "COLMAP dense depth maps");

  return {
    stage: "fusion",
    command: config.COLMAP_BIN,
    logLabel: "fusion",
    args: [
      "stereo_fusion",
      "--workspace_path", outputPaths.denseWorkspace,
      "--workspace_format", "COLMAP",
      "--input_type", "geometric",
      "--output_path", outputPaths.denseFused,
    ],
  };
}

export function runFusion(outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  return runStage(buildFusionCommand(outputFolder), hooks).then(() => {
    const outputPaths = resolveOutputPaths(outputFolder);
    requireExistingFile(outputPaths.denseFused, "COLMAP fused point cloud");
  });
}
