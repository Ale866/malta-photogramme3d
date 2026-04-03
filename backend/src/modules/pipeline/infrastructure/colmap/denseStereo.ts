import { config } from "../../../../shared/config/env";
import type { RunColmapStageHooks } from "../../application/ports";
import {
  ensureDirectoryHasFiles,
  requireExistingDirectory,
  resolveOutputPaths,
  runStage,
  type StageCommand,
} from "../colmapRunner";

function buildDenseStereoCommand(outputFolder: string): StageCommand {
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
      "--PatchMatchStereo.geom_consistency", "true",
      "--PatchMatchStereo.filter", "true",
    ],
  };
}

export function runDenseStereo(outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  return runStage(buildDenseStereoCommand(outputFolder), hooks).then(() => {
    const outputPaths = resolveOutputPaths(outputFolder);
    requireExistingDirectory(outputPaths.denseStereo);
    ensureDirectoryHasFiles(outputPaths.denseDepthMaps, "COLMAP dense depth maps");
  });
}
