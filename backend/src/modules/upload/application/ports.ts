import type { ModelJobRepository } from "../../model-jobs/domain/modelJobRepository";

type UploadCoordinates = {
  x: number;
  y: number;
  z: number;
};

type UploadSourceType = "images" | "video";

type UploadVideoDraft = {
  index: number;
  originalName: string;
  totalChunks: number;
  uploadedChunks: number;
  videoPath: string | null;
};

type UploadDraft = {
  uploadId: string;
  ownerId: string;
  title: string;
  inputFolder: string;
  outputFolder: string;
  type: UploadSourceType;
  totalFiles: number;
  coordinates: UploadCoordinates;
  videos: UploadVideoDraft[];
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
    appendVideoChunk: (
      inputFolder: string,
      file: Express.Multer.File,
      options: {
        videoIndex: number;
        chunkIndex: number;
        originalName: string;
        existingVideoPath?: string | null;
      }
    ) => string;
    listFiles: (inputFolder: string) => string[];
    deleteDirectory: (dirPath: string) => void;
    clearTemporaryVideoSources: (inputFolder: string) => void;
  };
  videoFrames: {
    extractFrames: (
      videoPath: string,
      inputFolder: string,
      framePrefix: string,
      clearExisting?: boolean
    ) => Promise<string[]>;
  };
};
