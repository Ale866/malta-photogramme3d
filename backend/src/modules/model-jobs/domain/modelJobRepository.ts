export const MODEL_JOB_STATUS = {
  QUEUED: "queued",
  FEATURE_EXTRACTION_RUNNING: "feature_extraction_running",
  FEATURE_EXTRACTION_COMPLETED: "feature_extraction_completed",
  FEATURE_MATCHING_RUNNING: "feature_matching_running",
  FEATURE_MATCHING_COMPLETED: "feature_matching_completed",
  SPARSE_MAPPING_RUNNING: "sparse_mapping_running",
  SPARSE_MAPPING_COMPLETED: "sparse_mapping_completed",
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
}
