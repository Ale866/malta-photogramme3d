import { spawn } from "child_process";
import type { PipelineProgressEvent, PipelineStage, RunMeshroomHooks } from "../application/ports";

const STAGE_RANGES: Record<PipelineStage, { min: number; max: number; rank: number }> = {
  starting: { min: 0, max: 5, rank: 0 },
  sfm: { min: 5, max: 40, rank: 1 },
  mvs: { min: 40, max: 70, rank: 2 },
  mesh_or_splat: { min: 70, max: 90, rank: 3 },
  packaging: { min: 90, max: 100, rank: 4 },
};

function clampToPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function detectStage(line: string): PipelineStage | null {
  const normalized = line.toLowerCase();

  if (/(packag|archive|compress|export|write.*(ply|obj|glb|gltf)|finaliz)/.test(normalized)) {
    return "packaging";
  }

  if (/(mesh|meshing|textur|splat|gaussian)/.test(normalized)) {
    return "mesh_or_splat";
  }

  if (/(mvs|depthmap|depth map|depthmapfilter|stereo)/.test(normalized)) {
    return "mvs";
  }

  if (/(sfm|structurefrommotion|feature|matching|camerainit)/.test(normalized)) {
    return "sfm";
  }

  return null;
}

function parsePercent(line: string): number | null {
  const match = line.match(/(\d{1,3}(?:\.\d+)?)\s*%/);
  if (!match) return null;

  const numeric = Number(match[1]);
  if (!Number.isFinite(numeric)) return null;

  if (numeric < 0 || numeric > 100) return null;
  return numeric;
}

function mapPercentToStageRange(stage: PipelineStage, percent: number): number {
  const range = STAGE_RANGES[stage];
  return range.min + (percent / 100) * (range.max - range.min);
}

class StageProgressTracker {
  private currentStage: PipelineStage = "starting";
  private currentProgress = 0;

  updateFromLine(line: string): PipelineProgressEvent {
    const maybeStage = detectStage(line);

    if (maybeStage) {
      const currentRank = STAGE_RANGES[this.currentStage].rank;
      const nextRank = STAGE_RANGES[maybeStage].rank;
      if (nextRank >= currentRank) {
        this.currentStage = maybeStage;
        this.currentProgress = Math.max(this.currentProgress, STAGE_RANGES[maybeStage].min);
      }
    }

    const parsed = parsePercent(line);
    if (parsed !== null) {
      const mapped = mapPercentToStageRange(this.currentStage, parsed);
      this.currentProgress = Math.max(this.currentProgress, mapped);
    }

    this.currentProgress = clampToPercent(this.currentProgress);

    return {
      stage: this.currentStage,
      progress: this.currentProgress,
      line,
    };
  }
}

function streamToLines(
  stream: NodeJS.ReadableStream | null,
  onLine: (line: string) => void
) {
  if (!stream) return;

  let buffer = "";

  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const pieces = buffer.split(/\r?\n/);
    buffer = pieces.pop() ?? "";

    for (const line of pieces) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      onLine(trimmed);
    }
  });

  stream.on("end", () => {
    const trimmed = buffer.trim();
    if (trimmed) onLine(trimmed);
  });
}

export function runMeshroom(input: string, output: string, hooks?: RunMeshroomHooks): Promise<void> {
  return new Promise((resolve, reject) => {
    const tracker = new StageProgressTracker();

    const meshroom = spawn(
      "C:\\Users\\Alessandro\\Documents\\UNI\\FYP\\Meshroom-2025.1.0\\meshroom_batch.exe",
      [
        "--input", input,
        "--output", output,
        "--pipeline", "c:\\Users\\Alessandro\\Documents\\UNI\\FYP\\Meshroom-2025.1.0\\aliceVision\\share\\meshroom\\photogrammetryDraft.mg"
      ],
      { shell: true }
    );

    const emitProgress = (line: string) => {
      const event = tracker.updateFromLine(line);
      hooks?.onProgress?.(event);
    };

    streamToLines(meshroom.stdout, (line) => {
      console.log("[Meshroom]", line);
      emitProgress(line);
    });

    streamToLines(meshroom.stderr, (line) => {
      console.error("[Meshroom ERROR]", line);
      emitProgress(line);
    });

    meshroom.on("error", reject);

    meshroom.on("close", code => {
      if (code === 0) resolve();
      else reject(new Error(`Meshroom exit code ${code}`));
    });
  });
}
