import type { ModelJobRepository } from "../../model-jobs/domain/modelJobRepository";

type UploadCoordinates = {
  x: number;
  y: number;
  z: number;
};

type UploadDraft = {
  uploadId: string;
  ownerId: string;
  title: string;
  inputFolder: string;
  outputFolder: string;
  totalFiles: number;
  coordinates: UploadCoordinates;
};

export type UploadServices = {
  modelJobs: ModelJobRepository;
  uploadDrafts: {
    save: (draft: UploadDraft) => UploadDraft;
    findById: (uploadId: string) => UploadDraft | null;
    delete: (uploadId: string) => void;
  };
  fileStorage: {
    createUploadDirectories: (
      baseUpload: string,
      title: string,
      uploadId: string
    ) => {
      inputFolder: string;
      outputFolder: string;
    };
    appendBatchFiles: (
      inputFolder: string,
      batchIndex: number,
      files: Express.Multer.File[]
    ) => string[];
    listFiles: (inputFolder: string) => string[];
  };
};
