import type { ModelJobSnapshot } from './ModelJob';

export type ModelSummary = {
  id: string;
  ownerId: string;
  ownerNickname: string;
  title: string;
  sourceJobId: string | null;
  outputFolder: string;
  createdAt: string;
  coordinates: { x: number, y: number, z: number };
  modelJob?: ModelJobSnapshot | null;
};

export type ModelLifecycleStatus = 'ready' | 'pending' | 'failed';

export function getModelLifecycleStatus(model: ModelSummary): ModelLifecycleStatus {
  const status = model.modelJob?.status;

  if (status === 'queued' || status === 'running') return 'pending';
  if (status === 'failed') return 'failed';
  return 'ready';
}
