import type { ModelJobRepository } from "../../model-jobs/domain/modelJobRepository";

type UploadCoordinates = {
  x: number;
  y: number;
  z: number;
};

type UploadSourceType = "images" | "video";

type UploadDraft = {
  uploadId: string;
  ownerId: string;
  title: string;
  inputFolder: string;
  outputFolder: string;
  type: UploadSourceType;
  totalFiles: number;
  coordinates: UploadCoordinates;
  videoPath: string | null;
};

export type UploadServices = {
  modelJobs: ModelJobRepository;
  uploadDrafts: {
    save: (draft: UploadDraft) => UploadDraft;
    findById: (uploadId: string) => UploadDraft | null;
    delete: (uploadId: string) => void;
    update: (uploadId: string, patch: Partial<UploadDraft>) => UploadDraft | null;
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
    ) => Promise<string[]>;
    saveVideoFile: (inputFolder: string, file: Express.Multer.File) => string;
    listFiles: (inputFolder: string) => string[];
  };
  videoFrames: {
    extractFrames: (videoPath: string, inputFolder: string) => Promise<string[]>;
  };
};
