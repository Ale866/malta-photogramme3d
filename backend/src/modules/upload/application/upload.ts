import {
  createQueuedModelJob,
} from "../../model-jobs/application/jobLifecycle";
import type { ModelJobServices } from "../../model-jobs/application/ports";
import type { UploadServices } from "./ports";

type StartUploadInput = {
  ownerId?: string;
  title: unknown;
  files?: Express.Multer.File[];
  coordinates: { x: number, y: number, z: number };
};

export async function startUpload(services: UploadServices, input: StartUploadInput) {
  if (!input.ownerId) throw new Error("Not authenticated");

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) throw new Error("Title is required");

  const files = input.files ?? [];
  if (files.length === 0) throw new Error("No images uploaded");

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
