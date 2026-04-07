import { config } from "../../../../shared/config/env";
import type { PipelineProfile, RunColmapStageHooks } from "../../application/ports";
import {
  ensureDirectoryHasFiles,
  requireExistingDirectory,
  resolveOutputPaths,
  runStage,
  type StageCommand,
} from "../colmapRunner";

function buildStrictDenseStereoCommand(outputFolder: string): StageCommand {
  const outputPaths = resolveOutputPaths(outputFolder);
  requireExistingDirectory(outputPaths.denseWorkspace);
  requireExistingDirectory(outputPaths.denseImages);
  requireExistingDirectory(outputPaths.denseSparse);

  return {
    stage: "dense_stereo",
    command: config.COLMAP_BIN,
    logLabel: "dense_stereo",
    args: [
      "patch_match_stereo",
      "--workspace_path", outputPaths.denseWorkspace,
      "--workspace_format", "COLMAP",
      "--PatchMatchStereo.max_image_size", "2000",
      "--PatchMatchStereo.num_threads", "4",
      "--PatchMatchStereo.geom_consistency", "true",
      "--PatchMatchStereo.filter", "true",
    ],
  };
}

function buildRelaxedDenseStereoCommand(outputFolder: string): StageCommand {
  const command = buildStrictDenseStereoCommand(outputFolder);

  return {
    ...command,
    args: [
      "patch_match_stereo",
      "--workspace_path", resolveOutputPaths(outputFolder).denseWorkspace,
      "--workspace_format", "COLMAP",
      "--PatchMatchStereo.max_image_size", "2000",
      "--PatchMatchStereo.num_threads", "4",
      "--PatchMatchStereo.geom_consistency", "true",
      "--PatchMatchStereo.filter", "true",
    ],
  };
}

export function runDenseStereo(outputFolder: string, hooks?: RunColmapStageHooks, profile: PipelineProfile = "strict"
): Promise<void> {
  const command = profile === "relaxed"
    ? buildRelaxedDenseStereoCommand(outputFolder)
    : buildStrictDenseStereoCommand(outputFolder);

  return runStage(command, hooks).then(() => {
    const outputPaths = resolveOutputPaths(outputFolder);
    requireExistingDirectory(outputPaths.denseStereo);
    ensureDirectoryHasFiles(outputPaths.denseDepthMaps, "COLMAP dense depth maps");
  });
}
