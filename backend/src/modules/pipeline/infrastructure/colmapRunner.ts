import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import type { PipelineStage, PipelineProgressEvent, RunColmapStageHooks } from "../application/ports";

const COLMAP_EXECUTABLE = "C:\\Users\\Alessandro\\Documents\\UNI\\FYP\\colmap\\COLMAP.bat";
const CPU_THREAD_LIMIT = "2";

const OUTPUT_DIRECTORIES = {
  sparseRoot: "sparse",
  sparseModel: path.join("sparse", "0"),
};

type StageCommand = {
  stage: PipelineStage;
  command: string;
  args: string[];
  logLabel: string;
};

function ensureDirectory(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function buildDatabasePath(outputFolder: string) {
  return path.join(outputFolder, "database.db");
}

function buildImagePath(inputFolder: string) {
  return path.resolve(inputFolder);
}

function buildSparseRootPath(outputFolder: string) {
  return path.join(outputFolder, OUTPUT_DIRECTORIES.sparseRoot);
}

function buildSparseModelPath(outputFolder: string) {
  return path.join(outputFolder, OUTPUT_DIRECTORIES.sparseModel);
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

function runStage(stageCommand: StageCommand, hooks?: RunColmapStageHooks): Promise<void> {
  return new Promise((resolve, reject) => {
    let lastProgress = 0;

    const child = spawn(stageCommand.command, stageCommand.args, {
      shell: true,
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
      reject(error);
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
  ensureDirectory(outputFolder);

  return {
    stage: "feature_extraction",
    command: COLMAP_EXECUTABLE,
    logLabel: "feature_extraction",
    args: [
      "feature_extractor",
      "--database_path", buildDatabasePath(outputFolder),
      "--image_path", buildImagePath(inputFolder),
      "--FeatureExtraction.use_gpu", "0",
      "--FeatureExtraction.num_threads", CPU_THREAD_LIMIT,
    ],
  };
}

function buildFeatureMatchingCommand(outputFolder: string): StageCommand {
  return {
    stage: "feature_matching",
    command: COLMAP_EXECUTABLE,
    logLabel: "feature_matching",
    args: [
      "exhaustive_matcher",
      "--database_path", buildDatabasePath(outputFolder),
      "--FeatureMatching.use_gpu", "0",
      "--FeatureMatching.num_threads", CPU_THREAD_LIMIT,
    ],
  };
}

function buildSparseMappingCommand(inputFolder: string, outputFolder: string): StageCommand {
  const sparseRoot = buildSparseRootPath(outputFolder);

  ensureDirectory(sparseRoot);

  return {
    stage: "sparse_mapping",
    command: COLMAP_EXECUTABLE,
    logLabel: "sparse_mapping",
    args: [
      "mapper",
      "--database_path", buildDatabasePath(outputFolder),
      "--image_path", buildImagePath(inputFolder),
      "--output_path", sparseRoot,
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
    const sparseModelPath = buildSparseModelPath(outputFolder);
    if (!fs.existsSync(sparseModelPath)) {
      throw new Error(`COLMAP sparse mapping did not produce the expected output at ${sparseModelPath}`);
    }
  });
}
