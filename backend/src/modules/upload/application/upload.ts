import {
  createQueuedModelJob,
} from "../../model-jobs/application/jobLifecycle";
import type { ModelJobServices } from "../../model-jobs/application/ports";
import type { UploadServices } from "./ports";
import {
  badRequest,
  notFound,
  unauthorized,
} from "../../../shared/errors/applicationError";

type CoordinatesInput = { x: number, y: number, z: number };

type StartUploadInput = {
  ownerId?: string;
  title: unknown;
  totalFiles: unknown;
  coordinates: CoordinatesInput;
};

type AppendUploadBatchInput = {
  ownerId?: string;
  uploadId: unknown;
  batchIndex: unknown;
  files?: Express.Multer.File[];
};

type FinalizeUploadInput = {
  ownerId?: string;
  uploadId: unknown;
};

export async function startUpload(services: UploadServices, input: StartUploadInput) {
  const ownerId = requireOwnerId(input.ownerId);
  const title = requireTitle(input.title);
  const totalFiles = requirePositiveInteger(input.totalFiles, "total_files_required");
  const coordinates = requireCoordinates(input.coordinates);
  const uploadId = createUploadId();

  const prepared = services.fileStorage.createUploadDirectories(
    "uploads",
    title,
    uploadId
  );

  const draft = services.uploadDrafts.save({
    uploadId,
    ownerId,
    title,
    inputFolder: prepared.inputFolder,
    outputFolder: prepared.outputFolder,
    totalFiles,
    coordinates,
  });

  return {
    uploadId: draft.uploadId,
    totalFiles: draft.totalFiles,
  };
}

export async function appendUploadBatch(services: UploadServices, input: AppendUploadBatchInput) {
  const ownerId = requireOwnerId(input.ownerId);
  const uploadId = requireUploadId(input.uploadId);
  const batchIndex = requireBatchIndex(input.batchIndex);
  const files = input.files ?? [];

  validateImageFiles(files);
  if (files.length === 0) throw badRequest("No images uploaded", "images_required");

  const draft = requireOwnedUploadDraft(services, uploadId, ownerId);
  services.fileStorage.appendBatchFiles(draft.inputFolder, batchIndex, files);
  const imagePaths = services.fileStorage.listFiles(draft.inputFolder);
  return {
    uploadedFiles: imagePaths.length,
    totalFiles: draft.totalFiles,
  };
}

export async function finalizeUpload(services: UploadServices, input: FinalizeUploadInput) {
  const ownerId = requireOwnerId(input.ownerId);
  const uploadId = requireUploadId(input.uploadId);
  const draft = requireOwnedUploadDraft(services, uploadId, ownerId);
  const imagePaths = services.fileStorage.listFiles(draft.inputFolder);

  if (imagePaths.length !== draft.totalFiles) {
    throw badRequest("Upload is incomplete", "upload_incomplete");
  }

  if (imagePaths.length === 0) {
    throw badRequest("No images uploaded", "images_required");
  }

  const modelJobServices: ModelJobServices = { modelJobs: services.modelJobs };
  const job = await createQueuedModelJob(modelJobServices, {
    ownerId,
    title: draft.title,
    imagePaths,
    inputFolder: draft.inputFolder,
    outputFolder: draft.outputFolder,
    coordinates: draft.coordinates,
  });

  services.uploadDrafts.delete(uploadId);
  return { jobId: job.id };
}

function validateImageFiles(files: Express.Multer.File[]) {
  for (const file of files) {
    if (typeof file.mimetype === "string" && file.mimetype.startsWith("image/")) continue;
    throw badRequest("Only image uploads are supported", "invalid_upload_type");
  }
}

function requireOwnerId(ownerId?: string) {
  if (!ownerId) throw unauthorized("Not authenticated");
  return ownerId;
}

function requireTitle(title: unknown) {
  const normalized = typeof title === "string" ? title.trim() : "";
  if (!normalized) throw badRequest("Title is required", "title_required");
  return normalized;
}

function requirePositiveInteger(value: unknown, code: string) {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw badRequest("A valid total file count is required", code);
  }

  return parsed;
}

function requireUploadId(uploadId: unknown) {
  const normalized = typeof uploadId === "string" ? uploadId.trim() : "";
  if (!normalized) {
    throw badRequest("Upload ID is required", "upload_id_required");
  }

  if (!/^[A-Za-z0-9_-]+$/.test(normalized)) {
    throw badRequest("Upload ID is invalid", "upload_id_invalid");
  }

  return normalized;
}

function requireBatchIndex(batchIndex: unknown) {
  const parsed = typeof batchIndex === "number" ? batchIndex : Number.parseInt(String(batchIndex ?? ""), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw badRequest("A valid batch index is required", "batch_index_required");
  }

  return parsed;
}

function requireCoordinates(coordinates: unknown): CoordinatesInput {
  if (!coordinates || typeof coordinates !== "object") {
    throw badRequest("Coordinates are required", "coordinates_required");
  }

  const candidate = coordinates as Partial<CoordinatesInput>;
  const x = Number(candidate.x);
  const y = Number(candidate.y);
  const z = Number(candidate.z);

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    throw badRequest("Coordinates must be valid numbers", "invalid_coordinates");
  }

  return { x, y, z };
}

function requireOwnedUploadDraft(services: UploadServices, uploadId: string, ownerId: string) {
  const draft = services.uploadDrafts.findById(uploadId);
  if (!draft || draft.ownerId !== ownerId) {
    throw notFound("Upload not found", "upload_not_found");
  }

  return draft;
}

function createUploadId() {
  return `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
}
