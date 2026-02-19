import type { UploadServices } from "../application/ports";
import { modelJobServices } from "../../model-jobs/infrastructure/modelJobServices";
import { pipelineServices } from "../../pipeline/infrastructure/pipelineServices";
import { FileStorage } from "./fileStorage";
import { modelServices } from "../../model/infrastructure/modelService";
import { createModelFromJob as createModelFromJobUseCase } from "../../model/application/createModelFromJob";
import {
  createQueuedModelJob,
  setModelJobDone,
  setModelJobFailed,
  setModelJobRunning,
} from "../../model-jobs/application/jobLifecycle";

export const uploadServices: UploadServices = {
  modelJobs: {
    createQueued: (input) => createQueuedModelJob(modelJobServices, input),
    setRunning: (jobId) => setModelJobRunning(modelJobServices, jobId),
    setDone: (jobId) => setModelJobDone(modelJobServices, jobId),
    setFailed: (jobId) => setModelJobFailed(modelJobServices, jobId),
  },
  models: {
    createModelFromJob: (input) => createModelFromJobUseCase(modelServices, input),
  },
  fileStorage: {
    stageUpload: (baseUpload, title, files) =>
      FileStorage.stageUpload(baseUpload, title, files),
  },
  pipeline: pipelineServices,
};
