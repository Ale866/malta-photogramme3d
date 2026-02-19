import { createModelFromJob } from "../../model/application/createModelFromJob";
import type { ModelsServices } from "../../model/application/ports";
import {
  createQueuedModelJob,
  setModelJobDone,
  setModelJobFailed,
  setModelJobRunning,
} from "../../model-jobs/application/jobLifecycle";
import type { ModelJobServices } from "../../model-jobs/application/ports";

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

  const modelJobServices: ModelJobServices = { modelJobs: services.modelJobs };
  const modelsServices: ModelsServices = { models: services.models };

  const job = await createQueuedModelJob(modelJobServices, {
    ownerId: input.ownerId,
    title,
    imagePaths: prepared.imagePaths,
    inputFolder: prepared.inputFolder,
    outputFolder: prepared.outputFolder,
  });

  void (async () => {
    try {
      await setModelJobRunning(modelJobServices, job.id);

      await runMeshroomPipeline(services.pipeline, {
        inputFolder: prepared.inputFolder,
        outputFolder: prepared.outputFolder,
      });

      const model = await createModelFromJob(modelsServices, {
        ownerId: job.ownerId,
        sourceJobId: job.id,
        outputFolder: prepared.outputFolder,
        title: job.title,
      });

      await setModelJobDone(modelJobServices, job.id);

      console.log("Set done");
    } catch (e) {
      console.error("Pipeline failed for job", job.id, e);
      await setModelJobFailed(modelJobServices, job.id);
    }
  })();

  return { jobId: job.id };
}