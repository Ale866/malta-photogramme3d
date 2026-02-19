import { runMeshroomPipeline } from "../../pipeline/application/runMeshroomPipeline";
import type { UploadServices } from "./ports";

type StartUploadInput = {
  ownerId?: string;
  title: unknown;
  files?: Express.Multer.File[];
};

export async function startUpload(services: UploadServices, input: StartUploadInput) {
  if (!input.ownerId) throw new Error("Not authenticated");

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) throw new Error("Title is required");

  const files = input.files ?? [];
  if (files.length === 0) throw new Error("No images uploaded");

  const prepared = services.fileStorage.stageUpload("uploads", title, files);

  const job = await services.modelJobs.createQueued({
    ownerId: input.ownerId,
    title,
    imagePaths: prepared.imagePaths,
    inputFolder: prepared.inputFolder,
    outputFolder: prepared.outputFolder,
  });

  (async () => {
    try {
      await services.modelJobs.setRunning(job.id);

      await runMeshroomPipeline(services.pipeline, {
        inputFolder: prepared.inputFolder,
        outputFolder: prepared.outputFolder,
      });

      await services.modelJobs.setDone(job.id);
      await services.models.createModelFromJob({
        ownerId: job.ownerId,
        sourceJobId: job.id,
        outputFolder: job.outputFolder,
        title: job.title,
      });

      console.log("Set done");
    } catch (e) {
      console.error("Pipeline failed for job", job.id, e);
      await services.modelJobs.setFailed(job.id);
    }
  })();

  return { jobId: job.id };
}
