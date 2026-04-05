export type ModelOrientation = {
  x: number;
  y: number;
  z: number;
};

export type Model = {
  id: string;
  ownerId: string;
  title: string;
  sourceJobId: string | null;
  outputFolder: string;
  createdAt: Date;
  coordinates: { x: number, y: number, z: number };
  orientation: ModelOrientation;
  userVotesIds: string[];
};

export type CreateModelInput = {
  ownerId: string;
  title: string;
  outputFolder: string;
  sourceJobId?: string | null;
  coordinates: { x: number, y: number, z: number };
  orientation?: ModelOrientation;
};

export type VoteChangeResult = {
  changed: boolean;
};

export interface ModelRepository {
  create(input: CreateModelInput): Promise<Model>;
  findById(id: string): Promise<Model | null>;
  listCatalog(): Promise<Model[]>;
  listIslandCatalog(): Promise<Model[]>;
  listByOwner(ownerId: string): Promise<Model[]>;
  updateOrientation(modelId: string, orientation: ModelOrientation): Promise<Model | null>;
  vote(modelId: string, userId: string): Promise<VoteChangeResult>;
  unvote(modelId: string, userId: string): Promise<VoteChangeResult>;
  deleteById(modelId: string): Promise<boolean>;
}
