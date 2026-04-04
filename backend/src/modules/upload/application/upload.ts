import { createQueuedModelJob } from "../../model-jobs/application/jobLifecycle";
import type { ModelJobServices } from "../../model-jobs/application/ports";
import type { UploadServices } from "./ports";
import { badRequest, notFound, unauthorized } from "../../../shared/errors/applicationError";
import { config } from "../../../shared/config/env";

type CoordinatesInput = { x: number, y: number, z: number };
type UploadSourceType = "images" | "video";

type StartUploadInput = {
  ownerId?: string;
  title: unknown;
  totalFiles: unknown;
  type: unknown;
  coordinates: CoordinatesInput;
};

type AppendUploadBatchInput = {
  ownerId?: string;
  uploadId: unknown;
  batchIndex: unknown;
  files?: Express.Multer.File[];
  videoIndex?: unknown;
  chunkIndex?: unknown;
  totalChunks?: unknown;
  originalName?: unknown;
};

type FinalizeUploadInput = {
  ownerId?: string;
  uploadId: unknown;
};

export async function startUpload(services: UploadServices, input: StartUploadInput) {
  const ownerId = requireOwnerId(input.ownerId);
  const title = requireTitle(input.title);
  const totalFiles = requirePositiveInteger(input.totalFiles, "total_files_required");
  const type = requireSourceType(input.type);
  const coordinates = requireCoordinates(input.coordinates);
  const uploadId = createUploadId();

  const prepared = services.fileStorage.createUploadDirectories(
    config.UPLOAD_DIR,
    title,
    uploadId
  );

  const draft = services.uploadDrafts.save({
    uploadId,
    ownerId,
    title,
    inputFolder: prepared.inputFolder,
    outputFolder: prepared.outputFolder,
    type,
    totalFiles,
    coordinates,
    videos: [],
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

  const draft = requireOwnedUploadDraft(services, uploadId, ownerId);

  if (draft.type === "video") {
    validateVideoFiles(files);
    if (files.length === 0) throw badRequest("No video uploaded", "video_required");
    const videoChunk = requireVideoChunkInput(input);
    const currentVideo = findCurrentVideoDraft(draft, videoChunk);

    if (videoChunk.chunkIndex < currentVideo.uploadedChunks) {
      return {
        uploadedFiles: countUploadedVideoChunks(draft.videos),
        totalFiles: draft.totalFiles,
      };
    }
    if (videoChunk.chunkIndex !== currentVideo.uploadedChunks) {
      throw badRequest("Video chunks must be uploaded in order", "invalid_video_batch");
    }

    const videoPath = services.fileStorage.appendVideoChunk(
      draft.inputFolder,
      files[0],
      {
        videoIndex: videoChunk.videoIndex,
        chunkIndex: videoChunk.chunkIndex,
        originalName: videoChunk.originalName,
        existingVideoPath: currentVideo.videoPath,
      }
    );
    const updatedVideo = {
      ...currentVideo,
      videoPath,
      uploadedChunks: currentVideo.uploadedChunks + 1,
    };
    const updatedDraft = services.uploadDrafts.update(uploadId, {
      videos: upsertVideoDraft(draft.videos, updatedVideo),
    });

    return {
      uploadedFiles: countUploadedVideoChunks(updatedDraft?.videos ?? upsertVideoDraft(draft.videos, updatedVideo)),
      totalFiles: draft.totalFiles,
    };
  }

  validateImageFiles(files);
  if (files.length === 0) throw badRequest("No images uploaded", "images_required");

  await services.fileStorage.appendBatchFiles(draft.inputFolder, batchIndex, files);
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

  const imagePaths = draft.type === "video"
    ? await finalizeVideoUpload(services, draft)
    : services.fileStorage.listFiles(draft.inputFolder);

  if (draft.type !== "video" && imagePaths.length !== draft.totalFiles) {
    throw badRequest("Upload is incomplete", "upload_incomplete");
  }

  if (imagePaths.length === 0) {
    throw badRequest(
      draft.type === "video" ? "No frames were extracted from the uploaded video" : "No images uploaded",
      draft.type === "video" ? "video_frames_required" : "images_required"
    );
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

function validateVideoFiles(files: Express.Multer.File[]) {
  if (files.length !== 1) {
    throw badRequest("Each video chunk batch must contain exactly one file", "video_chunk_required");
  }

  for (const file of files) {
    if (typeof file.mimetype === "string" && file.mimetype.startsWith("video/")) continue;
    throw badRequest("Only video uploads are supported", "invalid_upload_type");
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

function requireSourceType(value: unknown): UploadSourceType {
  return value === "video" ? "video" : "images";
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

async function finalizeVideoUpload(services: UploadServices, draft: ReturnType<typeof requireOwnedUploadDraft>) {
  if (draft.videos.length === 0) {
    throw badRequest("Upload is incomplete", "upload_incomplete");
  }
  if (countUploadedVideoChunks(draft.videos) !== draft.totalFiles) {
    throw badRequest("Upload is incomplete", "upload_incomplete");
  }

  const sortedVideos = [...draft.videos].sort((left, right) => left.index - right.index);
  const allFrames: string[] = [];

  for (const [position, video] of sortedVideos.entries()) {
    if (!video.videoPath || video.uploadedChunks !== video.totalChunks) {
      throw badRequest("Upload is incomplete", "upload_incomplete");
    }

    const frames = await services.videoFrames.extractFrames(
      video.videoPath,
      draft.inputFolder,
      `video_${video.index}_frame_`,
      position === 0
    );
    allFrames.push(...frames);
  }

  services.fileStorage.clearTemporaryVideoSources(draft.inputFolder);
  return allFrames.sort();
}

function createUploadId() {
  return `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
}

function requireVideoChunkInput(input: AppendUploadBatchInput) {
  const videoIndex = requireBatchIndex(input.videoIndex);
  const chunkIndex = requireBatchIndex(input.chunkIndex);
  const totalChunks = requirePositiveInteger(input.totalChunks, "video_total_chunks_required");
  const originalName = typeof input.originalName === "string" ? input.originalName.trim() : "";

  if (!originalName) {
    throw badRequest("Video file name is required", "video_name_required");
  }

  return { videoIndex, chunkIndex, totalChunks, originalName };
}

function findCurrentVideoDraft(
  draft: ReturnType<typeof requireOwnedUploadDraft>,
  videoChunk: ReturnType<typeof requireVideoChunkInput>
) {
  const existingVideo = draft.videos.find((video) => video.index === videoChunk.videoIndex);
  if (!existingVideo) {
    if (videoChunk.chunkIndex !== 0) {
      throw badRequest("Video chunks must be uploaded in order", "invalid_video_batch");
    }

    return {
      index: videoChunk.videoIndex,
      originalName: videoChunk.originalName,
      totalChunks: videoChunk.totalChunks,
      uploadedChunks: 0,
      videoPath: null,
    };
  }

  if (existingVideo.originalName !== videoChunk.originalName || existingVideo.totalChunks !== videoChunk.totalChunks) {
    throw badRequest("Video chunk metadata does not match the current upload", "invalid_video_metadata");
  }

  return existingVideo;
}

function upsertVideoDraft(
  videos: ReturnType<typeof requireOwnedUploadDraft>["videos"],
  updatedVideo: ReturnType<typeof findCurrentVideoDraft>
) {
  const remainingVideos = videos.filter((video) => video.index !== updatedVideo.index);
  return [...remainingVideos, updatedVideo].sort((left, right) => left.index - right.index);
}

function countUploadedVideoChunks(videos: ReturnType<typeof requireOwnedUploadDraft>["videos"]) {
  return videos.reduce((sum, video) => sum + video.uploadedChunks, 0);
}
