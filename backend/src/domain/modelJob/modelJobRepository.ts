export interface ModelJob {
  id: string;
  ownerId: string;
  title: string;
  inputFolder: string;
  outputFolder: string;
  imagePaths: string[];
  status: 'queued' | 'running' | 'done' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export type CreateModelJobInput = {
  ownerId: string;
  title: string;
  status?: ModelJob['status'];
  inputFolder?: string;
  outputFolder?: string;
  imagePaths?: string[];
};

export interface ModelJobRepository {
  create(input: CreateModelJobInput): Promise<ModelJob>;
  findById(id: string): Promise<ModelJob | null>;
  setRunning(jobId: string): Promise<void>;
  setDone(jobId: string, patch?: { outputFolder?: string }): Promise<void>;
  setFailed(jobId: string): Promise<void>;
}