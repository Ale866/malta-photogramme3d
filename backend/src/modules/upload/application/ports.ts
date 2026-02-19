import type { ModelJobRepository } from "../../model-jobs/domain/modelJobRepository";
import type { ModelRepository } from "../../model/domain/modelRepository";
import type { PipelineServices } from "../../pipeline/application/ports";

export type UploadServices = {
  modelJobs: ModelJobRepository;
  models: ModelRepository;
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