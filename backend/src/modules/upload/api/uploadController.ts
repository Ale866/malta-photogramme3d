import { Response } from "express";
import type { AuthedRequest } from "../../../shared/authenticate";
import { appendUploadBatch, finalizeUpload, startUpload } from "../application/upload";
import { badRequest, sendErrorResponse } from "../../../shared/errors/applicationError";
import { modelJobRepo } from "../../model-jobs/infrastructure/modelJobRepo";
import { FileStorage } from "../infrastructure/fileStorage";
import { uploadDraftStore } from "../infrastructure/uploadDraftStore";
import { videoFrameExtractor } from "../infrastructure/videoFrameExtractor";

const uploadDependencies = {
  modelJobs: modelJobRepo,
  uploadDrafts: uploadDraftStore,
  fileStorage: FileStorage,
  videoFrames: videoFrameExtractor,
};

function parseCoordinates(input: unknown) {
  if (typeof input !== "string") return input;

  try {
    return JSON.parse(input);
  } catch {
    throw badRequest("Invalid coordinates JSON", "invalid_coordinates_json");
  }
}

export async function uploadInitController(req: AuthedRequest, res: Response) {
  try {
    const { title, coordinates, totalFiles, type } = req.body ?? {};
    const parsedCoordinates = parseCoordinates(coordinates);

    const result = await startUpload(uploadDependencies, {
      ownerId: req.user?.sub,
      title,
      totalFiles,
      type,
      coordinates: parsedCoordinates,
    });

    return res.status(201).json({
      success: true,
      message: "Upload started",
      uploadId: result.uploadId,
      totalFiles: result.totalFiles,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
}

export async function uploadBatchController(req: AuthedRequest, res: Response) {
  try {
    const files = req.files as Express.Multer.File[];
    const { batchIndex, videoIndex, chunkIndex, totalChunks, originalName } = req.body ?? {};

    const result = await appendUploadBatch(uploadDependencies, {
      ownerId: req.user?.sub,
      uploadId: req.params.uploadId,
      batchIndex,
      files,
      videoIndex,
      chunkIndex,
      totalChunks,
      originalName,
    });

    return res.status(202).json({
      success: true,
      message: "Batch uploaded",
      uploadedFiles: result.uploadedFiles,
      totalFiles: result.totalFiles,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
}

export async function uploadFinalizeController(req: AuthedRequest, res: Response) {
  try {
    const result = await finalizeUpload(uploadDependencies, {
      ownerId: req.user?.sub,
      uploadId: req.params.uploadId,
    });

    return res.status(202).json({
      success: true,
      message: "Upload accepted",
      jobId: result.jobId,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
}
