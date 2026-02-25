import { createModelFromJob } from "../../model/application/createModelFromJob";
import type { ModelsServices } from "../../model/application/ports";
import {
  createQueuedModelJob,
  setModelJobRunning,
  setModelJobSucceeded,
  updateModelJobRuntime,
} from "../../model-jobs/application/jobLifecycle";
import type { ModelJobServices } from "../../model-jobs/application/ports";

import { runMeshroomPipeline } from "../../pipeline/application/runMeshroomPipeline";
import type { UploadServices } from "./ports";

type StartUploadInput = {
  ownerId?: string;
  title: unknown;
  files?: Express.Multer.File[];
};

const LOG_TAIL_MAX_LINES = 200;
const JOB_UPDATE_THROTTLE_MS = 1000;

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
    let stage = "starting";
    let progress = 1;
    let logTail: string[] = [];

    const persistRuntime = async () => {
      await updateModelJobRuntime(modelJobServices, job.id, {
        stage,
        progress,
        logTail: [...logTail],
      });
    };

    const interval = setInterval(() => {
      void persistRuntime();
    }, JOB_UPDATE_THROTTLE_MS);

    const captureRuntime = (next: { stage?: string; progress?: number; line?: string }) => {
      if (typeof next.stage === "string" && next.stage.trim()) {
        stage = next.stage.trim();
      }

      if (typeof next.progress === "number" && Number.isFinite(next.progress)) {
        progress = Math.max(progress, Math.round(next.progress));
      }

      if (typeof next.line === "string" && next.line.trim()) {
        logTail.push(next.line.trim());
        if (logTail.length > LOG_TAIL_MAX_LINES) {
          logTail = logTail.slice(-LOG_TAIL_MAX_LINES);
        }
      }
    };

    await setModelJobRunning(modelJobServices, job.id);
    captureRuntime({ stage: "starting", progress: 1 });

    await runMeshroomPipeline(services.pipeline, {
      inputFolder: prepared.inputFolder,
      outputFolder: prepared.outputFolder,
    }, {
      onProgress: (event) => {
        captureRuntime({
          stage: event.stage,
          progress: event.progress,
          line: event.line,
        });
      },
    });

    await persistRuntime();

    const model = await createModelFromJob(modelsServices, {
      ownerId: job.ownerId,
      sourceJobId: job.id,
      outputFolder: prepared.outputFolder,
      title: job.title,
    });

    await setModelJobSucceeded(modelJobServices, job.id, { modelId: model.id });
    clearInterval(interval);
  })();

  return { jobId: job.id };
}
