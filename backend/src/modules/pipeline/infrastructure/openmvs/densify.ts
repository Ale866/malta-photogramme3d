import fs from "fs";
import { config } from "../../../../shared/config/env";
import type { RunColmapStageHooks } from "../../application/ports";
import {
  removePathIfExists,
  requireExistingDirectory,
  requireExistingFile,
  resolveOutputPaths,
  runStage,
  type StageCommand,
} from "../colmapRunner";

function buildDensifyCommand(outputFolder: string): StageCommand {
  const outputPaths = resolveOutputPaths(outputFolder);
  requireExistingDirectory(outputPaths.openmvsWorkspace);
  requireExistingFile(outputPaths.openmvsScene, "OpenMVS scene");

  return {
    stage: "meshing",
    command: config.OPENMVS_DENSIFY_POINT_CLOUD_BIN,
    logLabel: "densify",
    toolLabel: "OpenMVS",
    cwd: outputPaths.openmvsWorkspace,
    args: [
      "--working-folder", outputPaths.openmvsWorkspace,
      "--input-file", outputPaths.openmvsScene,
      "--output-file", outputPaths.openmvsSceneDense,
      "--cuda-device", "-1",
      "--resolution-level", "1",
      "--max-threads", "1",
      "--archive-type", "-1",
      "--verbosity", "1",
    ],
  };
}

export async function runOpenMvsDensify(outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  const outputPaths = resolveOutputPaths(outputFolder);
  const command = buildDensifyCommand(outputFolder);

  const staleOutputs = [
    outputPaths.openmvsSceneDense,
    outputPaths.openmvsSceneDensePly,
    outputPaths.openmvsSceneDenseMesh,
    outputPaths.openmvsSceneDenseMeshPly,
    outputPaths.openmvsSceneDenseMeshTexture,
    outputPaths.openmvsSceneDenseMeshTexturePly,
    outputPaths.openmvsSceneDenseMeshTextureImage,
  ];

  const existingStaleOutputs = staleOutputs.filter((target) => fs.existsSync(target));
  if (existingStaleOutputs.length > 0) {
    console.warn(
      `[OpenMVS densify] Removing stale outputs before densify: ${existingStaleOutputs.join(", ")}`
    );
    existingStaleOutputs.forEach((target) => removePathIfExists(target));
  }

  try {
    const workspaceContents = fs.readdirSync(outputPaths.openmvsWorkspace).sort();
    console.info(
      `[OpenMVS densify] Workspace contents before run: ${workspaceContents.join(", ") || "(empty)"}`
    );
  } catch (error) {
    console.warn("[OpenMVS densify] Failed to read workspace contents", error);
  }

  console.info(
    `[OpenMVS densify] Command: ${command.command} ${command.args.join(" ")}`
  );
  await runStage(command, hooks);
  requireExistingFile(outputPaths.openmvsSceneDense, "OpenMVS dense scene");
}
