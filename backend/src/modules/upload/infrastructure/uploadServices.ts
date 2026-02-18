import type { UploadServices } from "../application/ports";
import { modelJobRepo } from "../../model-jobs/infrastructure/repo/modelJobRepo";
import { pipelineServices } from "../../pipeline/infrastructure/pipelineServices";
import { FileStorage } from "./fileStorage";

export const uploadServices: UploadServices = {
  modelJobs: modelJobRepo,
  fileStorage: {
    createJobDirectories: (baseUpload, title) => FileStorage.createJobDirectories(baseUpload, title),
    moveFile: (src, dest) => FileStorage.moveFile(src, dest),
  },
  pipeline: pipelineServices,
};
