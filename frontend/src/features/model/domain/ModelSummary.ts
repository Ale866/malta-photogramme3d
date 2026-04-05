import { MODEL_JOB_STATUS, isModelJobPendingStatus, type ModelJobSnapshot } from './ModelJob';

export type ModelVoteState = {
  modelId: string;
  voteCount: number;
  hasVoted: boolean;
};

export const MIN_ISLAND_MODEL_VOTES = 3;

export type ModelSummary = {
  id: string;
  ownerId: string;
  ownerNickname: string;
  title: string;
  sourceJobId: string | null;
  outputFolder: string;
  meshAssetUrl: string;
  textureAssetUrl: string | null;
  createdAt: string;
  coordinates: { x: number, y: number, z: number };
  orientation: { x: number, y: number, z: number };
  voteCount: number;
  hasVoted: boolean;
  hasBeenRerun: boolean;
  modelJob?: ModelJobSnapshot | null;
};

export type ModelLifecycleStatus = 'ready' | 'pending' | 'failed';

export function canRenderModelOnIsland(voteCount: number): boolean {
  return voteCount >= MIN_ISLAND_MODEL_VOTES;
}

export function applyVoteStateToModel(model: ModelSummary, voteState: ModelVoteState): ModelSummary {
  if (model.id !== voteState.modelId) return model;

  return {
    ...model,
    voteCount: voteState.voteCount,
    hasVoted: voteState.hasVoted,
  };
}

export function getModelLifecycleStatus(model: ModelSummary): ModelLifecycleStatus {
  const status = model.modelJob?.status;

  if (status && isModelJobPendingStatus(status)) return 'pending';
  if (status === MODEL_JOB_STATUS.FAILED) return 'failed';
  return 'ready';
}
