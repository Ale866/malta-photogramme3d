export type Model = {
  id: string;
  ownerId: string;
  title: string;
  sourceJobId: string | null;
  outputFolder: string;
  createdAt: Date;
  coordinates: { x: number, y: number, z: number };
  userVotesIds: string[];
};

export type CreateModelInput = {
  ownerId: string;
  title: string;
  outputFolder: string;
  sourceJobId?: string | null;
  coordinates: { x: number, y: number, z: number };
};

export type VoteChangeResult = {
  changed: boolean;
};

export interface ModelRepository {
  create(input: CreateModelInput): Promise<Model>;
  findById(id: string): Promise<Model | null>;
  listCatalog(): Promise<Model[]>;
  listByOwner(ownerId: string): Promise<Model[]>;
  vote(modelId: string, userId: string): Promise<VoteChangeResult>;
  unvote(modelId: string, userId: string): Promise<VoteChangeResult>;
}
