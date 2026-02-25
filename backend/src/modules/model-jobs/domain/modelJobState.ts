import type { ModelJobStatus } from "./modelJobRepository";

const ALLOWED_TRANSITIONS: Record<ModelJobStatus, readonly ModelJobStatus[]> = {
  queued: ["running", "failed"],
  running: ["succeeded", "failed"],
  succeeded: [],
  failed: [],
};

export function normalizeModelJobStatus(status: string): ModelJobStatus {
  if (status === "done") return "succeeded";
  if (status === "queued" || status === "running" || status === "succeeded" || status === "failed") {
    return status;
  }
  throw new Error(`Unknown model job status: ${status}`);
}

export function assertModelJobStatusTransition(
  current: ModelJobStatus,
  next: ModelJobStatus
): void {
  if (current === next) return;
  if (!ALLOWED_TRANSITIONS[current].includes(next)) {
    throw new Error(`Invalid status transition: ${current} -> ${next}`);
  }
}

export function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  if (progress < 0) return 0;
  if (progress > 100) return 100;
  return Math.round(progress);
}
