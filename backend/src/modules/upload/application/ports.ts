import type { ModelJobRepository } from "../../model-jobs/domain/modelJobRepository";
import type { PipelineServices } from "../../pipeline/application/ports";

export type UploadServices = {
  modelJobs: ModelJobRepository;
  fileStorage: {
    stageUpload: (
      baseUpload: string,
      title: string,
      files: Express.Multer.File[]
    ) => {
      inputFolder: string;
      outputFolder: string;
      imagePaths: string[];
    };
  };
  pipeline: PipelineServices;
};