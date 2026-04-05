import fs from "fs";
import path from "path";
import { spawn, spawnSync } from "child_process";
import type { PipelineStage, PipelineProgressEvent, RunColmapStageHooks } from "../application/ports";
import { config } from "../../../shared/config/env";

export const CPU_THREAD_LIMIT = "8";
export const GPU_ENABLED = "1";
export const MIN_FUSED_POINT_COUNT_FOR_MESHING = 2000;

const OUTPUT_DIRECTORIES = {
  sparseRoot: "sparse",
  sparseModel: path.join("sparse", "0"),
  denseWorkspace: "dense",
  denseImages: path.join("dense", "images"),
  denseSparse: path.join("dense", "sparse"),
  denseStereo: path.join("dense", "stereo"),
  denseDepthMaps: path.join("dense", "stereo", "depth_maps"),
  denseFused: path.join("dense", "fused.ply"),
  denseMeshedPoisson: path.join("dense", "meshed-poisson.ply"),
  denseMeshedPoissonSimplified: path.join("dense", "meshed-poisson-simplified.ply"),
  denseTextured: path.join("dense", "textured"),
  openmvsWorkspace: "openmvs",
  openmvsScene: path.join("openmvs", "scene.mvs"),
  openmvsSceneDense: path.join("openmvs", "scene_dense.mvs"),
  openmvsSceneDensePly: path.join("openmvs", "scene_dense.ply"),
  openmvsSceneDenseMesh: path.join("openmvs", "scene_dense_mesh.mvs"),
  openmvsSceneDenseMeshPly: path.join("openmvs", "scene_dense_mesh.ply"),
  openmvsSceneDenseMeshTexture: path.join("openmvs", "scene_dense_mesh_texture.mvs"),
  openmvsSceneDenseMeshTexturePly: path.join("openmvs", "scene_dense_mesh_texture.ply"),
  openmvsSceneDenseMeshTextureImage: path.join("openmvs", "scene_dense_mesh_texture0.png"),
};

export type StageCommand = {
  stage: PipelineStage;
  command: string;
  args: string[];
  logLabel: string;
  toolLabel?: string;
  cwd?: string;
};

export type OutputPaths = {
  root: string;
  database: string;
  sparseRoot: string;
  sparseModel: string;
  denseWorkspace: string;
  denseImages: string;
  denseSparse: string;
  denseStereo: string;
  denseDepthMaps: string;
  denseFused: string;
  denseMeshedPoisson: string;
  denseMeshedPoissonSimplified: string;
  denseTextured: string;
  openmvsWorkspace: string;
  openmvsScene: string;
  openmvsSceneDense: string;
  openmvsSceneDensePly: string;
  openmvsSceneDenseMesh: string;
  openmvsSceneDenseMeshPly: string;
  openmvsSceneDenseMeshTexture: string;
  openmvsSceneDenseMeshTexturePly: string;
  openmvsSceneDenseMeshTextureImage: string;
};

export function ensureDirectory(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function resetDirectory(dir: string) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

export function resolveRequiredPath(targetPath: string, label: string) {
  const normalizedInput = typeof targetPath === "string" ? targetPath.trim() : "";
  if (!normalizedInput) {
    throw new Error(`${label} is required`);
  }

  return path.resolve(normalizedInput);
}

export function requireExistingDirectory(dir: string) {
  const normalized = resolveRequiredPath(dir, "Directory path");
  if (!fs.existsSync(normalized) || !fs.statSync(normalized).isDirectory()) {
    throw new Error(`Directory does not exist: ${normalized}`);
  }

  return normalized;
}

export function requireExistingFile(filePath: string, label: string) {
  const normalized = resolveRequiredPath(filePath, label);
  if (!fs.existsSync(normalized) || !fs.statSync(normalized).isFile()) {
    throw new Error(`${label} does not exist: ${normalized}`);
  }

  return normalized;
}

export function readPlyVertexCount(filePath: string, label: string) {
  const normalized = requireExistingFile(filePath, label);
  const fileDescriptor = fs.openSync(normalized, "r");

  try {
    const buffer = Buffer.alloc(16 * 1024);
    const bytesRead = fs.readSync(fileDescriptor, buffer, 0, buffer.length, 0);
    const header = buffer.toString("utf8", 0, bytesRead).split(/\r?\n/);
    const endHeaderIndex = header.findIndex((line) => line.trim() === "end_header");
    const vertexLine = header
      .slice(0, endHeaderIndex >= 0 ? endHeaderIndex + 1 : header.length)
      .find((line) => line.startsWith("element vertex "));

    const vertexCount = Number(vertexLine?.slice("element vertex ".length) ?? "");
    if (!Number.isFinite(vertexCount)) {
      throw new Error(`${label} has an invalid vertex count: ${normalized}`);
    }

    return vertexCount;
  } finally {
    fs.closeSync(fileDescriptor);
  }
}

export function resolveImagePath(inputFolder: string) {
  return requireExistingDirectory(inputFolder);
}

export function resolveOutputPaths(outputFolder: string): OutputPaths {
  const root = resolveRequiredPath(outputFolder, "COLMAP output path");

  return {
    root,
    database: path.join(root, "database.db"),
    sparseRoot: path.join(root, OUTPUT_DIRECTORIES.sparseRoot),
    sparseModel: path.join(root, OUTPUT_DIRECTORIES.sparseModel),
    denseWorkspace: path.join(root, OUTPUT_DIRECTORIES.denseWorkspace),
    denseImages: path.join(root, OUTPUT_DIRECTORIES.denseImages),
    denseSparse: path.join(root, OUTPUT_DIRECTORIES.denseSparse),
    denseStereo: path.join(root, OUTPUT_DIRECTORIES.denseStereo),
    denseDepthMaps: path.join(root, OUTPUT_DIRECTORIES.denseDepthMaps),
    denseFused: path.join(root, OUTPUT_DIRECTORIES.denseFused),
    denseMeshedPoisson: path.join(root, OUTPUT_DIRECTORIES.denseMeshedPoisson),
    denseMeshedPoissonSimplified: path.join(root, OUTPUT_DIRECTORIES.denseMeshedPoissonSimplified),
    denseTextured: path.join(root, OUTPUT_DIRECTORIES.denseTextured),
    openmvsWorkspace: path.join(root, OUTPUT_DIRECTORIES.openmvsWorkspace),
    openmvsScene: path.join(root, OUTPUT_DIRECTORIES.openmvsScene),
    openmvsSceneDense: path.join(root, OUTPUT_DIRECTORIES.openmvsSceneDense),
    openmvsSceneDensePly: path.join(root, OUTPUT_DIRECTORIES.openmvsSceneDensePly),
    openmvsSceneDenseMesh: path.join(root, OUTPUT_DIRECTORIES.openmvsSceneDenseMesh),
    openmvsSceneDenseMeshPly: path.join(root, OUTPUT_DIRECTORIES.openmvsSceneDenseMeshPly),
    openmvsSceneDenseMeshTexture: path.join(root, OUTPUT_DIRECTORIES.openmvsSceneDenseMeshTexture),
    openmvsSceneDenseMeshTexturePly: path.join(root, OUTPUT_DIRECTORIES.openmvsSceneDenseMeshTexturePly),
    openmvsSceneDenseMeshTextureImage: path.join(root, OUTPUT_DIRECTORIES.openmvsSceneDenseMeshTextureImage),
  };
}

export function ensureDirectoryHasFiles(dir: string, label: string) {
  const normalized = requireExistingDirectory(dir);
  const entries = fs.readdirSync(normalized);
  if (entries.length === 0) {
    throw new Error(`${label} is empty: ${normalized}`);
  }

  return normalized;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function parsePercent(line: string): number | null {
  const match = line.match(/(\d{1,3}(?:\.\d+)?)\s*%/);
  if (!match) return null;

  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  if (value < 0 || value > 100) return null;
  return value;
}

function streamToLines(stream: NodeJS.ReadableStream | null, onLine: (line: string) => void) {
  if (!stream) return;

  let buffer = "";

  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.trim();
      if (line) onLine(line);
    }
  });

  stream.on("end", () => {
    const line = buffer.trim();
    if (line) onLine(line);
  });
}

function isColmapErrorLine(line: string): boolean {
  return /^E\d{8}\s/.test(line);
}

function formatCommandForLog(command: string, args: string[]) {
  const quoted = [command, ...args].map((part) => {
    if (/[\s"]/u.test(part)) {
      return `"${part.replace(/"/g, '\\"')}"`;
    }

    return part;
  });

  return quoted.join(" ");
}

export function verifyExecutable(
  command: string,
  args: string[],
  label: string,
  options?: { allowedExitCodes?: number[] }
): void {
  const result = spawnSync(command, args, {
    shell: false,
    windowsHide: true,
    encoding: "utf8",
    timeout: 15000,
  });

  if (result.error) {
    throw new Error(`${label} is invalid or not available: ${command}. ${result.error.message}`);
  }

  const allowedExitCodes = options?.allowedExitCodes ?? [0];
  if (typeof result.status === "number" && !allowedExitCodes.includes(result.status)) {
    const details = result.stderr?.trim() || result.stdout?.trim() || `exit code ${result.status}`;
    throw new Error(`${label} failed validation: ${command}. ${details}`);
  }
}

export function verifyColmapBinary(): void {
  verifyExecutable(config.COLMAP_BIN, ["-h"], "COLMAP_BIN");
}

export function runStage(stageCommand: StageCommand, hooks?: RunColmapStageHooks): Promise<void> {
  return new Promise((resolve, reject) => {
    let lastProgress = 0;
    const toolLabel = stageCommand.toolLabel ?? "COLMAP";

    console.log(`[${toolLabel} ${stageCommand.logLabel}] Executing ${formatCommandForLog(stageCommand.command, stageCommand.args)}`);

    const child = spawn(stageCommand.command, stageCommand.args, {
      shell: false,
      windowsHide: true,
      cwd: stageCommand.cwd,
    });

    const emitLine = (line: string) => {
      const parsedProgress = parsePercent(line);
      if (parsedProgress !== null) {
        lastProgress = Math.max(lastProgress, clampPercent(parsedProgress));
      }

      const event: PipelineProgressEvent = {
        stage: stageCommand.stage,
        progress: lastProgress,
      };

      hooks?.onProgress?.(event);
    };

    streamToLines(child.stdout, (line) => {
      console.log(`[${toolLabel} ${stageCommand.logLabel}]`, line);
      emitLine(line);
    });

    streamToLines(child.stderr, (line) => {
      if (isColmapErrorLine(line)) {
        console.error(`[${toolLabel} ${stageCommand.logLabel} ERROR]`, line);
      } else {
        console.log(`[${toolLabel} ${stageCommand.logLabel}]`, line);
      }
      emitLine(line);
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to start ${toolLabel} executable "${stageCommand.command}": ${error.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${toolLabel} ${stageCommand.logLabel} failed with exit code ${code}`));
    });
  });
}
