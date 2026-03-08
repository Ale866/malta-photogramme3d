import type { ModelJobRepository } from "../../model-jobs/domain/modelJobRepository";

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
  processNextQueuedModelJob: () => Promise<void>;
};
