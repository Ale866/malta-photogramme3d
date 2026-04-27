import { config } from "../../../../shared/config/env";
import type { PipelineProfile, RunColmapStageHooks } from "../../application/ports";
import {
  ensureDirectoryHasFiles,
  requireExistingDirectory,
  resolveOutputPaths,
  runStage,
  type StageCommand,
} from "../colmapRunner";

type DenseStereoOptions = {
  maxImageSize: string;
  numThreads: string;
  geomConsistency: string;
  filter: string;
};

function buildDenseStereoCommand(outputFolder: string, options: DenseStereoOptions): StageCommand {
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
      "--PatchMatchStereo.max_image_size", options.maxImageSize,
      "--PatchMatchStereo.num_threads", options.numThreads,
      "--PatchMatchStereo.geom_consistency", options.geomConsistency,
      "--PatchMatchStereo.filter", options.filter,
    ],
  };
}

function buildStrictDenseStereoCommand(outputFolder: string): StageCommand {
  return buildDenseStereoCommand(outputFolder, {
    maxImageSize: "2000",
    numThreads: "6",
    geomConsistency: "true",
    filter: "true",
  });
}

function buildRelaxedDenseStereoCommand(outputFolder: string): StageCommand {
  return buildDenseStereoCommand(outputFolder, {
    maxImageSize: "2000",
    numThreads: "6",
    geomConsistency: "true",
    filter: "true",
  });
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
