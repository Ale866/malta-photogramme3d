import { config } from "../../../../shared/config/env";
import type { RunColmapStageHooks } from "../../application/ports";
import {
  MIN_FUSED_POINT_COUNT_FOR_MESHING,
  readPlyVertexCount,
  requireExistingDirectory,
  requireExistingFile,
  resolveOutputPaths,
  runStage,
  type StageCommand,
} from "../colmapRunner";

function buildMeshingCommand(outputFolder: string): StageCommand {
  const outputPaths = resolveOutputPaths(outputFolder);
  requireExistingDirectory(outputPaths.denseWorkspace);
  requireExistingFile(outputPaths.denseFused, "COLMAP fused point cloud");

  return {
    stage: "meshing",
    command: config.COLMAP_BIN,
    logLabel: "meshing",
    args: [
      "poisson_mesher",
      "--input_path", outputPaths.denseFused,
      "--output_path", outputPaths.denseMeshedPoisson,
    ],
  };
}

export function runMeshing(outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  const outputPaths = resolveOutputPaths(outputFolder);
  const fusedPointCount = readPlyVertexCount(outputPaths.denseFused, "COLMAP fused point cloud");

  if (fusedPointCount < MIN_FUSED_POINT_COUNT_FOR_MESHING) {
    throw new Error(
      `Too few points were reconstructed (${fusedPointCount}) to build a mesh. The uploaded images did not produce a dense enough point cloud for mesh reconstruction. Try again taking a more complete dataset with more images and/or better coverage of the scene.`
    );
  }

  return runStage(buildMeshingCommand(outputFolder), hooks).then(() => {
    requireExistingFile(outputPaths.denseMeshedPoisson, "COLMAP meshed point cloud");
  });
}
