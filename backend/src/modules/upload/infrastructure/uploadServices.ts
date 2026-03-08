import type { UploadServices } from "../application/ports";
import { modelJobServices } from "../../model-jobs/infrastructure/modelJobServices";
import { pipelineQueueRunner } from "../../pipeline/infrastructure/pipelineServices";
import { FileStorage } from "./fileStorage";

export const uploadServices: UploadServices = {
  modelJobs: modelJobServices.modelJobs,
  fileStorage: {
    stageUpload: (baseUpload, title, files) =>
      FileStorage.stageUpload(baseUpload, title, files),
  },
  processNextQueuedModelJob: () => pipelineQueueRunner.processNextQueuedModelJob(),
};
