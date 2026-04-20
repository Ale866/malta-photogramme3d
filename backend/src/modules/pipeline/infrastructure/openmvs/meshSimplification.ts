import fs from "fs";
import path from "path";
import { config } from "../../../../shared/config/env";
import type { RunColmapStageHooks } from "../../application/ports";
import {
  readPlyFaceCount,
  readPlyVertexCount,
  requireExistingDirectory,
  requireExistingFile,
  resolveOutputPaths,
  runStage,
  type StageCommand,
} from "../colmapRunner";

const TARGET_FACE_RATIO = "0.75";
const MIN_ACCEPTED_FACE_RATIO = 0.4;

export async function simplifyMeshForTexturing(
  outputFolder: string,
  meshPath: string,
  hooks?: RunColmapStageHooks
): Promise<string> {
  const outputPaths = resolveOutputPaths(outputFolder);
  const sourceMeshPath = requireExistingFile(meshPath, "OpenMVS mesh for simplification");
  const simplifiedMeshPath = outputPaths.openmvsSceneMeshSimplifiedPly;

  try {
    if (fs.existsSync(simplifiedMeshPath)) {
      fs.rmSync(simplifiedMeshPath, { force: true });
    }

    const command = buildMeshSimplificationCommand(outputFolder, sourceMeshPath, simplifiedMeshPath);
    console.info(
      `[OpenMVS mesh_simplification] Command: ${command.command} ${command.args.join(" ")}`
    );
    await runStage(command, hooks);

    return validateSimplifiedMesh(sourceMeshPath, simplifiedMeshPath);
  } catch (error) {
    console.warn(
      `[OpenMVS mesh_simplification] Failed; texturing will use ${path.basename(sourceMeshPath)}`,
      error
    );
    return sourceMeshPath;
  }
}

function buildMeshSimplificationCommand(
  outputFolder: string,
  inputMeshPath: string,
  outputMeshPath: string
): StageCommand {
  const outputPaths = resolveOutputPaths(outputFolder);
  requireExistingDirectory(outputPaths.openmvsWorkspace);

  return {
    stage: "meshing",
    command: config.COLMAP_BIN,
    logLabel: "mesh_simplification",
    toolLabel: "COLMAP",
    cwd: outputPaths.openmvsWorkspace,
    args: [
      "mesh_simplifier",
      "--input_path", inputMeshPath,
      "--output_path", outputMeshPath,
      "--MeshSimplification.target_face_ratio", TARGET_FACE_RATIO,
    ],
  };
}

function validateSimplifiedMesh(sourceMeshPath: string, simplifiedMeshPath: string) {
  const sourceFaceCount = readPlyFaceCount(sourceMeshPath, "OpenMVS mesh for simplification");
  const simplifiedFaceCount = readPlyFaceCount(simplifiedMeshPath, "Simplified OpenMVS mesh");
  const simplifiedVertexCount = readPlyVertexCount(simplifiedMeshPath, "Simplified OpenMVS mesh");
  const shouldFallback =
    simplifiedVertexCount <= 0 ||
    simplifiedFaceCount <= 0 ||
    simplifiedFaceCount < sourceFaceCount * MIN_ACCEPTED_FACE_RATIO;

  console.info(
    `[OpenMVS mesh_simplification] Result: source_faces=${sourceFaceCount}, simplified_faces=${simplifiedFaceCount}, simplified_vertices=${simplifiedVertexCount}, fallback=${shouldFallback}`
  );

  if (shouldFallback) {
    console.warn(
      `[OpenMVS mesh_simplification] Simplified mesh is too aggressive; texturing will use ${path.basename(sourceMeshPath)}`
    );
    return sourceMeshPath;
  }

  console.info(`[OpenMVS mesh_simplification] Texturing will use ${path.basename(simplifiedMeshPath)}`);
  return requireExistingFile(simplifiedMeshPath, "Simplified OpenMVS mesh");
}
