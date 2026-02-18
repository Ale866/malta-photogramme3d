export type Model = {
  id: string;
  ownerId: string;
  title: string;
  sourceJobId: string | null;
  outputFolder: string;
  createdAt: Date;
};

export type CreateModelInput = {
  ownerId: string;
  title: string;
  outputFolder: string;
  sourceJobId?: string | null;
};

export interface ModelRepository {
  create(input: CreateModelInput): Promise<Model>;
  findById(id: string): Promise<Model | null>;
  listByOwner(ownerId: string): Promise<Model[]>;
}