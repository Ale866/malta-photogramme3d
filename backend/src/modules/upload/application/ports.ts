import type { ModelJobRepository } from "../../model-jobs/domain/modelJobRepository";
import type { PipelineServices } from "../../pipeline/application/ports";

export type UploadServices = {
  modelJobs: ModelJobRepository;
  fileStorage: {
    createJobDirectories: (baseUpload: string, title: string) => {
      inputFolder: string;
      outputFolder: string;
    };
    moveFile: (src: string, dest: string) => void;
  };
  pipeline: PipelineServices;
};
