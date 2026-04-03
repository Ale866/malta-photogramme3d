import fs from "fs";
import path from "path";
import { spawn, spawnSync } from "child_process";
import type { PipelineStage, PipelineProgressEvent, RunColmapStageHooks } from "../application/ports";
import { config } from "../../../shared/config/env";

const CPU_THREAD_LIMIT = "8";
const GPU_ENABLED = "1";

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
};

type StageCommand = {
  stage: PipelineStage;
  command: string;
  args: string[];
  logLabel: string;
};

type OutputPaths = {
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
};

function ensureDirectory(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function resetDirectory(dir: string) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function resolveRequiredPath(targetPath: string, label: string) {
  const normalizedInput = typeof targetPath === "string" ? targetPath.trim() : "";
  if (!normalizedInput) {
    throw new Error(`${label} is required`);
  }

  return path.resolve(normalizedInput);
}

function requireExistingDirectory(dir: string) {
  const normalized = resolveRequiredPath(dir, "Directory path");
  if (!fs.existsSync(normalized) || !fs.statSync(normalized).isDirectory()) {
    throw new Error(`Directory does not exist: ${normalized}`);
  }

  return normalized;
}

function requireExistingFile(filePath: string, label: string) {
  const normalized = resolveRequiredPath(filePath, label);
  if (!fs.existsSync(normalized) || !fs.statSync(normalized).isFile()) {
    throw new Error(`${label} does not exist: ${normalized}`);
  }

  return normalized;
}

function resolveImagePath(inputFolder: string) {
  return requireExistingDirectory(inputFolder);
}

function resolveOutputPaths(outputFolder: string): OutputPaths {
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
  };
}

function ensureDirectoryHasFiles(dir: string, label: string) {
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

export function verifyColmapBinary(): void {
  const result = spawnSync(config.COLMAP_BIN, ["-h"], {
    shell: false,
    windowsHide: true,
    encoding: "utf8",
    timeout: 15000,
  });

  if (result.error) {
    throw new Error(`COLMAP_BIN is invalid or not available: ${config.COLMAP_BIN}. ${result.error.message}`);
  }

  if (typeof result.status === "number" && result.status !== 0) {
    const details = result.stderr?.trim() || result.stdout?.trim() || `exit code ${result.status}`;
    throw new Error(`COLMAP_BIN failed validation: ${config.COLMAP_BIN}. ${details}`);
  }
}

function runStage(stageCommand: StageCommand, hooks?: RunColmapStageHooks): Promise<void> {
  return new Promise((resolve, reject) => {
    let lastProgress = 0;

    console.log(`[COLMAP ${stageCommand.logLabel}] Executing ${formatCommandForLog(stageCommand.command, stageCommand.args)}`);

    const child = spawn(stageCommand.command, stageCommand.args, {
      shell: false,
      windowsHide: true,
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
      console.log(`[COLMAP ${stageCommand.logLabel}]`, line);
      emitLine(line);
    });

    streamToLines(child.stderr, (line) => {
      if (isColmapErrorLine(line)) {
        console.error(`[COLMAP ${stageCommand.logLabel} ERROR]`, line);
      } else {
        console.log(`[COLMAP ${stageCommand.logLabel}]`, line);
      }
      emitLine(line);
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to start COLMAP executable "${stageCommand.command}": ${error.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`COLMAP ${stageCommand.logLabel} failed with exit code ${code}`));
    });
  });
}

function buildFeatureExtractionCommand(inputFolder: string, outputFolder: string): StageCommand {
  const imagePath = resolveImagePath(inputFolder);
  const outputPaths = resolveOutputPaths(outputFolder);
  ensureDirectory(outputPaths.root);

  return {
    stage: "feature_extraction",
    command: config.COLMAP_BIN,
    logLabel: "feature_extraction",
    args: [
      "feature_extractor",
      "--database_path", outputPaths.database,
      "--image_path", imagePath,
      "--FeatureExtraction.use_gpu", GPU_ENABLED,
      "--FeatureExtraction.num_threads", CPU_THREAD_LIMIT,
    ],
  };
}

function buildFeatureMatchingCommand(outputFolder: string): StageCommand {
  const outputPaths = resolveOutputPaths(outputFolder);
  ensureDirectory(outputPaths.root);
  requireExistingFile(outputPaths.database, "COLMAP database_path");

  return {
    stage: "feature_matching",
    command: config.COLMAP_BIN,
    logLabel: "feature_matching",
    args: [
      "exhaustive_matcher",
      "--database_path", outputPaths.database,
      "--FeatureMatching.use_gpu", GPU_ENABLED,
      "--FeatureMatching.num_threads", CPU_THREAD_LIMIT,
    ],
  };
}

function buildSparseMappingCommand(inputFolder: string, outputFolder: string): StageCommand {
  const imagePath = resolveImagePath(inputFolder);
  const outputPaths = resolveOutputPaths(outputFolder);
  requireExistingFile(outputPaths.database, "COLMAP database_path");

  ensureDirectory(outputPaths.sparseRoot);

  return {
    stage: "sparse_mapping",
    command: config.COLMAP_BIN,
    logLabel: "sparse_mapping",
    args: [
      "mapper",
      "--database_path", outputPaths.database,
      "--image_path", imagePath,
      "--output_path", outputPaths.sparseRoot,
    ],
  };
}

function buildDensePreparationCommand(inputFolder: string, outputFolder: string): StageCommand {
  const imagePath = resolveImagePath(inputFolder);
  const outputPaths = resolveOutputPaths(outputFolder);
  requireExistingDirectory(outputPaths.sparseModel);

  resetDirectory(outputPaths.denseWorkspace);

  return {
    stage: "dense_preparation",
    command: config.COLMAP_BIN,
    logLabel: "dense_preparation",
    args: [
      "image_undistorter",
      "--image_path", imagePath,
      "--input_path", outputPaths.sparseModel,
      "--output_path", outputPaths.denseWorkspace,
      "--output_type", "COLMAP",
    ],
  };
}

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

function buildFusionCommand(outputFolder: string): StageCommand {
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
    ],
  };
}

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

function buildSimplificationCommand(outputFolder: string): StageCommand {
  const outputPaths = resolveOutputPaths(outputFolder);
  requireExistingDirectory(outputPaths.denseWorkspace);
  requireExistingFile(outputPaths.denseMeshedPoisson, "COLMAP meshed point cloud");

  return {
    stage: "simplification",
    command: config.COLMAP_BIN,
    logLabel: "simplification",
    args: [
      "mesh_simplifier",
      "--input_path", outputPaths.denseMeshedPoisson,
      "--output_path", outputPaths.denseMeshedPoissonSimplified,
    ],
  };
}

function buildTexturingCommand(outputFolder: string): StageCommand {
  const outputPaths = resolveOutputPaths(outputFolder);
  requireExistingDirectory(outputPaths.denseWorkspace);
  requireExistingDirectory(outputPaths.denseImages);
  requireExistingDirectory(outputPaths.denseSparse);
  requireExistingFile(outputPaths.denseMeshedPoissonSimplified, "COLMAP simplified mesh");

  resetDirectory(outputPaths.denseTextured);

  return {
    stage: "texturing",
    command: config.COLMAP_BIN,
    logLabel: "texturing",
    args: [
      "mesh_texturer",
      "--input_path", outputPaths.denseMeshedPoissonSimplified,
      "--output_path", outputPaths.denseTextured,
      "--workspace_path", outputPaths.denseWorkspace,
      "--workspace_format", "COLMAP",
    ],
  };
}

export function runFeatureExtraction(inputFolder: string, outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  return runStage(buildFeatureExtractionCommand(inputFolder, outputFolder), hooks);
}

export function runFeatureMatching(outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  return runStage(buildFeatureMatchingCommand(outputFolder), hooks);
}

export function runSparseMapping(inputFolder: string, outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  return runStage(buildSparseMappingCommand(inputFolder, outputFolder), hooks).then(() => {
    const outputPaths = resolveOutputPaths(outputFolder);
    if (!fs.existsSync(outputPaths.sparseModel)) {
      throw new Error(`COLMAP sparse mapping did not produce the expected output at ${outputPaths.sparseModel}`);
    }
  });
}

export function runDensePreparation(inputFolder: string, outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  return runStage(buildDensePreparationCommand(inputFolder, outputFolder), hooks).then(() => {
    const outputPaths = resolveOutputPaths(outputFolder);
    requireExistingDirectory(outputPaths.denseWorkspace);
    requireExistingDirectory(outputPaths.denseImages);
    ensureDirectoryHasFiles(outputPaths.denseSparse, "COLMAP dense sparse path");
  });
}

export function runDenseStereo(outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  return runStage(buildDenseStereoCommand(outputFolder), hooks).then(() => {
    const outputPaths = resolveOutputPaths(outputFolder);
    requireExistingDirectory(outputPaths.denseStereo);
    ensureDirectoryHasFiles(outputPaths.denseDepthMaps, "COLMAP dense depth maps");
  });
}

export function runFusion(outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  return runStage(buildFusionCommand(outputFolder), hooks).then(() => {
    const outputPaths = resolveOutputPaths(outputFolder);
    requireExistingFile(outputPaths.denseFused, "COLMAP fused point cloud");
  });
}

export function runMeshing(outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  return runStage(buildMeshingCommand(outputFolder), hooks).then(() => {
    const outputPaths = resolveOutputPaths(outputFolder);
    requireExistingFile(outputPaths.denseMeshedPoisson, "COLMAP meshed point cloud");
  });
}

export function runSimplification(outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  return runStage(buildSimplificationCommand(outputFolder), hooks).then(() => {
    const outputPaths = resolveOutputPaths(outputFolder);
    requireExistingFile(outputPaths.denseMeshedPoissonSimplified, "COLMAP simplified mesh");
  });
}

export function runTexturing(outputFolder: string, hooks?: RunColmapStageHooks): Promise<void> {
  return runStage(buildTexturingCommand(outputFolder), hooks).then(() => {
    const outputPaths = resolveOutputPaths(outputFolder);
    ensureDirectoryHasFiles(outputPaths.denseTextured, "COLMAP textured mesh output");
  });
}
