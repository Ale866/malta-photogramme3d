import { config } from "../../../../shared/config/env";
import type { PipelineProfile, RunColmapStageHooks } from "../../application/ports";
import {
  ensureDirectoryHasFiles,
  requireExistingDirectory,
  requireExistingFile,
  resolveOutputPaths,
  runStage,
  type StageCommand,
} from "../colmapRunner";

type FusionOptions = {
  inputType: "geometric" | "photometric";
  minNumPixels: string;
  maxDepthError: string;
  maxReprojError: string;
};

function buildFusionCommand(outputFolder: string, options: FusionOptions): StageCommand {
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
      "--input_type", options.inputType,
      "--output_path", outputPaths.denseFused,
      "--StereoFusion.min_num_pixels", options.minNumPixels,
      "--StereoFusion.max_depth_error", options.maxDepthError,
      "--StereoFusion.max_reproj_error", options.maxReprojError,
    ],
  };
}

function buildStrictFusionCommand(outputFolder: string): StageCommand {
  return buildFusionCommand(outputFolder, {
    inputType: "geometric",
    minNumPixels: "6",
    maxDepthError: "0.01",
    maxReprojError: "2",
  });
}

function buildRelaxedFusionCommand(outputFolder: string): StageCommand {
  return buildFusionCommand(outputFolder, {
    inputType: "photometric",
    minNumPixels: "3",
    maxDepthError: "0.02",
    maxReprojError: "4",
  });
}

export function runFusion(outputFolder: string, hooks?: RunColmapStageHooks, profile: PipelineProfile = "strict"
): Promise<void> {
  const command = profile === "relaxed"
    ? buildRelaxedFusionCommand(outputFolder)
    : buildStrictFusionCommand(outputFolder);

  return runStage(command, hooks).then(() => {
    const outputPaths = resolveOutputPaths(outputFolder);
    requireExistingFile(outputPaths.denseFused, "COLMAP fused point cloud");
  });
}
