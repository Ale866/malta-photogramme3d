import type { UploadServices } from "../application/ports";
import { modelJobServices } from "../../model-jobs/infrastructure/modelJobServices";
import { pipelineServices } from "../../pipeline/infrastructure/pipelineServices";
import { FileStorage } from "./fileStorage";
import { modelServices } from "../../model/infrastructure/modelService";

export const uploadServices: UploadServices = {
  modelJobs: modelJobServices.modelJobs,
  models: modelServices.models,
  fileStorage: {
    stageUpload: (baseUpload, title, files) =>
      FileStorage.stageUpload(baseUpload, title, files),
  },
  pipeline: pipelineServices,
};