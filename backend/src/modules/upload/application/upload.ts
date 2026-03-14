import {
  createQueuedModelJob,
} from "../../model-jobs/application/jobLifecycle";
import type { ModelJobServices } from "../../model-jobs/application/ports";
import type { UploadServices } from "./ports";
import { badRequest, unauthorized } from "../../../shared/errors/applicationError";

type StartUploadInput = {
  ownerId?: string;
  title: unknown;
  files?: Express.Multer.File[];
  coordinates: { x: number, y: number, z: number };
};

export async function startUpload(services: UploadServices, input: StartUploadInput) {
  if (!input.ownerId) throw unauthorized("Not authenticated");

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) throw badRequest("Title is required", "title_required");

  const files = input.files ?? [];
  if (files.length === 0) throw badRequest("No images uploaded", "images_required");

  const prepared = services.fileStorage.stageUpload("uploads", title, files);

  const modelJobServices: ModelJobServices = { modelJobs: services.modelJobs };

  const job = await createQueuedModelJob(modelJobServices, {
    ownerId: input.ownerId,
    title,
    imagePaths: prepared.imagePaths,
    inputFolder: prepared.inputFolder,
    outputFolder: prepared.outputFolder,
    coordinates: input.coordinates,
  });

  return { jobId: job.id };
}
