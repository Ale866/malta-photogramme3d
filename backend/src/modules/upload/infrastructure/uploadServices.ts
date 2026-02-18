import type { UploadServices } from "../application/ports";
import { modelJobRepo } from "../../model-jobs/infrastructure/repo/modelJobRepo";
import { pipelineServices } from "../../pipeline/infrastructure/pipelineServices";
import { FileStorage } from "./fileStorage";

export const uploadServices: UploadServices = {
  modelJobs: modelJobRepo,
  fileStorage: {
    stageUpload: (baseUpload, title, files) => FileStorage.stageUpload(baseUpload, title, files),
  },
  pipeline: pipelineServices,
};