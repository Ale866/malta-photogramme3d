import type { ModelJobRepository } from "../../model-jobs/domain/modelJobRepository";
import type { ModelRepository } from "../../model/domain/modelRepository";
import type { PipelineServices } from "../../pipeline/application/ports";
import type { ModelJobStatusDto } from "../../model-jobs/application/jobStatusDto";

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
  jobRealtime?: {
    emitUpdate: (job: ModelJobStatusDto) => void;
  };
};
