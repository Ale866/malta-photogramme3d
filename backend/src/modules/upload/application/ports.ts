import type { CreateModelInput, Model } from "../../model/domain/modelRepository";
import type { PipelineServices } from "../../pipeline/application/ports";

export type QueuedUploadJob = {
  id: string;
  ownerId: string;
  title: string;
  outputFolder: string;
};

export type CreateQueuedUploadJobInput = {
  ownerId: string;
  title: string;
  imagePaths: string[];
  inputFolder: string;
  outputFolder: string;
};

export type UploadServices = {
  modelJobs: {
    createQueued: (input: CreateQueuedUploadJobInput) => Promise<QueuedUploadJob>;
    setRunning: (jobId: string) => Promise<void>;
    setDone: (jobId: string) => Promise<void>;
    setFailed: (jobId: string) => Promise<void>;
  };
  models: {
    createModelFromJob: (input: CreateModelInput) => Promise<Model>;
  };
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
