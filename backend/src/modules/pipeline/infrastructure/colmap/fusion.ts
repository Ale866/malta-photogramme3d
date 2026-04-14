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

function buildStrictFusionCommand(outputFolder: string): StageCommand {
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
      "--StereoFusion.min_num_pixels", "6",
      "--StereoFusion.max_depth_error", "0.01",
      "--StereoFusion.max_reproj_error", "2",
    ],
  };
}

function buildRelaxedFusionCommand(outputFolder: string): StageCommand {
  const command = buildStrictFusionCommand(outputFolder);

  return {
    ...command,
    args: [
      ...command.args.slice(0, 5),
      "--input_type", "photometric",
      "--output_path", resolveOutputPaths(outputFolder).denseFused,
      "--StereoFusion.min_num_pixels", "3",
      "--StereoFusion.max_depth_error", "0.02",
      "--StereoFusion.max_reproj_error", "4",
    ],
  };
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
