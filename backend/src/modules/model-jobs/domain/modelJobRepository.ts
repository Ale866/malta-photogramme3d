export type ModelJobStatus = "queued" | "running" | "succeeded" | "failed";

export interface ModelJob {
  id: string;
  ownerId: string;
  title: string;
  inputFolder: string;
  outputFolder: string;
  imagePaths: string[];
  status: ModelJobStatus;
  stage: string;
  progress: number;
  logTail: string[];
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
  stage?: string;
  progress?: number;
  logTail?: string[];
  error?: string | null;
  modelId?: string | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
};

export type UpdateModelJobStateInput = {
  status?: ModelJobStatus;
  stage?: string;
  progress?: number;
  logTail?: string[];
  error?: string | null;
  modelId?: string | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  outputFolder?: string;
};

export interface ModelJobRepository {
  create(input: CreateModelJobInput): Promise<ModelJob>;
  findById(id: string): Promise<ModelJob | null>;
  updateState(jobId: string, patch: UpdateModelJobStateInput): Promise<ModelJob | null>;
}
