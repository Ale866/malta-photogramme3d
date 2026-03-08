import type { UploadServices } from "../application/ports";
import { executeModelJob } from "../../pipeline/application/executeModelJob";
import { modelJobServices } from "../../model-jobs/infrastructure/modelJobServices";
import { pipelineExecutionServices } from "../../pipeline/infrastructure/pipelineServices";
import { FileStorage } from "./fileStorage";

export const uploadServices: UploadServices = {
  modelJobs: modelJobServices.modelJobs,
  fileStorage: {
    stageUpload: (baseUpload, title, files) =>
      FileStorage.stageUpload(baseUpload, title, files),
  },
  executeModelJob: (input) => executeModelJob(pipelineExecutionServices, input),
};
