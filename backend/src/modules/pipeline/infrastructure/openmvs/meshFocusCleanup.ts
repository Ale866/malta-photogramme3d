import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
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

const MESH_CLEANUP_REQUIREMENTS = ["numpy", "scipy", "trimesh", "PIL"];

let meshCleanupPythonPromise: Promise<string> | null = null;

export async function runStrictMeshFocusCleanup(outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  const outputPaths = resolveOutputPaths(outputFolder);
  requireExistingDirectory(outputPaths.openmvsWorkspace);
  requireExistingFile(outputPaths.openmvsSceneMeshPly, "OpenMVS mesh");

  if (fs.existsSync(outputPaths.openmvsSceneMeshCleanedPly)) {
    fs.rmSync(outputPaths.openmvsSceneMeshCleanedPly, { force: true });
  }

  const pythonExecutable = await ensureMeshCleanupPython();
  const command = buildMeshFocusCleanupCommand(outputFolder, pythonExecutable);
  await runStage(command, hooks);
  requireExistingFile(outputPaths.openmvsSceneMeshCleanedPly, "OpenMVS cleaned mesh");
}

export function resolveStrictMeshForTexturing(outputFolder: string): string {
  const outputPaths = resolveOutputPaths(outputFolder);
  const rawMeshPath = requireExistingFile(outputPaths.openmvsSceneMeshPly, "OpenMVS mesh");
  const cleanedMeshPath = outputPaths.openmvsSceneMeshCleanedPly;

  if (!fs.existsSync(cleanedMeshPath)) {
    console.warn("[OpenMVS focus_cleanup] Cleaned mesh not found; falling back to raw mesh for texturing");
    return rawMeshPath;
  }

  try {
    const originalFaceCount = readPlyFaceCount(rawMeshPath, "OpenMVS mesh");
    const cleanedFaceCount = readPlyFaceCount(cleanedMeshPath, "OpenMVS cleaned mesh");
    const cleanedVertexCount = readPlyVertexCount(cleanedMeshPath, "OpenMVS cleaned mesh");
    const shouldFallback = cleanedVertexCount <= 0 || cleanedFaceCount <= 0 || cleanedFaceCount < originalFaceCount * 0.2;

    console.info(
      `[OpenMVS focus_cleanup] Mesh fallback check: raw_faces=${originalFaceCount}, cleaned_faces=${cleanedFaceCount}, cleaned_vertices=${cleanedVertexCount}, fallback=${shouldFallback}`
    );

    if (shouldFallback) {
      console.warn("[OpenMVS focus_cleanup] Cleaned mesh is too aggressive; using raw mesh for texturing");
      return rawMeshPath;
    }

    console.info(`[OpenMVS focus_cleanup] Using cleaned mesh for texturing: ${cleanedMeshPath}`);
    return cleanedMeshPath;
  } catch (error) {
    console.warn("[OpenMVS focus_cleanup] Failed to validate cleaned mesh; falling back to raw mesh", error);
    return rawMeshPath;
  }
}

async function ensureMeshCleanupPython(): Promise<string> {
  if (!meshCleanupPythonPromise) {
    meshCleanupPythonPromise = Promise.resolve().then(() => resolveMeshCleanupPython());
  }

  return meshCleanupPythonPromise;
}

function resolveMeshCleanupPython(): string {
  const venvDir = path.join(config.BACKEND_ROOT, ".mesh_cleanup_venv");
  const venvPython = getVenvPythonPath(venvDir);

  if (!fs.existsSync(venvDir) || !fs.statSync(venvDir).isDirectory()) {
    throw new Error(`Mesh cleanup venv directory is missing: ${venvDir}`);
  }

  if (!fs.existsSync(venvPython) || !fs.statSync(venvPython).isFile()) {
    throw new Error(`Mesh cleanup python executable is missing: ${venvPython}`);
  }

  console.info(`[OpenMVS focus_cleanup] Using pre-provisioned mesh cleanup environment at ${venvDir}`);

  if (!hasMeshCleanupDependencies(venvPython)) {
    throw new Error(`Mesh cleanup environment is missing required dependencies: ${venvPython}`);
  }

  return venvPython;
}

function hasMeshCleanupDependencies(pythonExecutable: string): boolean {
  const result = spawnSync(
    pythonExecutable,
    ["-c", `import ${MESH_CLEANUP_REQUIREMENTS.join(", ")}`],
    {
      shell: false,
      windowsHide: true,
      encoding: "utf8",
      timeout: 30000,
    }
  );

  return !result.error && result.status === 0;
}

function getVenvPythonPath(venvDir: string): string {
  return process.platform === "win32"
    ? path.join(venvDir, "Scripts", "python.exe")
    : path.join(venvDir, "bin", "python");
}

function runCheckedCommand(command: string, args: string[], label: string): void {
  const result = spawnSync(command, args, {
    shell: false,
    windowsHide: true,
    encoding: "utf8",
    timeout: 10 * 60 * 1000,
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    throw new Error(`Failed to ${label}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const details = result.stderr?.trim() || result.stdout?.trim() || `exit code ${result.status}`;
    throw new Error(`Failed to ${label}: ${details}`);
  }
}

function buildMeshFocusCleanupCommand(outputFolder: string, pythonExecutable: string): StageCommand {
  const outputPaths = resolveOutputPaths(outputFolder);

  return {
    stage: "meshing",
    command: pythonExecutable,
    logLabel: "focus_cleanup",
    toolLabel: "OpenMVS",
    cwd: outputPaths.openmvsWorkspace,
    args: [
      path.join(config.BACKEND_ROOT, "scripts", "strict_mesh_focus_cleanup.py"),
      "--input",
      outputPaths.openmvsSceneMeshPly,
      "--output",
      outputPaths.openmvsSceneMeshCleanedPly,
    ],
  };
}
