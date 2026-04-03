export const MODEL_JOB_STATUS = {
  QUEUED: "queued",
  FEATURE_EXTRACTION: "feature_extraction",
  FEATURE_MATCHING: "feature_matching",
  SPARSE_MAPPING: "sparse_mapping",
  DENSE_PREPARATION: "dense_preparation",
  DENSE_STEREO: "dense_stereo",
  FUSION: "fusion",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type ModelJobStatus = (typeof MODEL_JOB_STATUS)[keyof typeof MODEL_JOB_STATUS];

export type ModelJobCoordinates = {
  x: number;
  y: number;
  z: number;
};

export interface ModelJob {
  id: string;
  ownerId: string;
  title: string;
  inputFolder: string;
  outputFolder: string;
  imagePaths: string[];
  coordinates: ModelJobCoordinates | null;
  status: ModelJobStatus;
  stage: string;
  progress: number;
  error: string | null;
  modelId: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateModelJobInput = {
  ownerId: string;
  title: string;
  status?: ModelJobStatus;
  inputFolder?: string;
  outputFolder?: string;
  imagePaths?: string[];
  coordinates?: ModelJobCoordinates | null;
  stage?: string;
  progress?: number;
  error?: string | null;
  modelId?: string | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
};

export type UpdateModelJobStateInput = {
  status?: ModelJobStatus;
  stage?: string;
  progress?: number;
  error?: string | null;
  modelId?: string | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  outputFolder?: string;
};

export interface ModelJobRepository {
  create(input: CreateModelJobInput): Promise<ModelJob>;
  findById(id: string): Promise<ModelJob | null>;
  claimNextQueued(): Promise<ModelJob | null>;
  updateState(jobId: string, patch: UpdateModelJobStateInput): Promise<ModelJob | null>;
  listNonCompletedByOwner(ownerId: string): Promise<ModelJob[]>;
  deleteById(jobId: string): Promise<boolean>;
}
