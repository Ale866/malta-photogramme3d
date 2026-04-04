import { MODEL_JOB_STATUS, type ModelJob, type ModelJobCoordinates } from "../domain/modelJobRepository";
import { clampProgress, normalizeModelJobStatus } from "../domain/modelJobState";

function toCoordinates(value: unknown): ModelJobCoordinates | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  const x = candidate.x;
  const y = candidate.y;
  const z = candidate.z;

  if (![x, y, z].every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate))) {
    return null;
  }

  return {
    x: x as number,
    y: y as number,
    z: z as number,
  };
}

export function toModelJobDomain(doc: any): ModelJob {
  return {
    id: doc._id.toString(),
    ownerId: doc.ownerId,
    title: doc.title,
    inputFolder: doc.inputFolder ?? "",
    outputFolder: doc.outputFolder ?? "",
    imagePaths: doc.imagePaths ?? [],
    coordinates: toCoordinates(doc.coordinates),
    status: normalizeModelJobStatus(doc.status),
    stage: doc.stage ?? MODEL_JOB_STATUS.QUEUED,
    progress: clampProgress(doc.progress ?? 0),
    error: doc.error ?? null,
    modelId: doc.modelId ?? null,
    hasBeenRerun: Boolean(doc.hasBeenRerun),
    startedAt: doc.startedAt ?? null,
    finishedAt: doc.finishedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
