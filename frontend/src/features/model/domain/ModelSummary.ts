import type { ModelCoordinates } from './ModelCreationDraft';
import type { ModelJobSnapshot } from './ModelJob';

export type ModelSummary = {
  id: string;
  ownerId: string;
  title: string;
  sourceJobId: string | null;
  outputFolder: string;
  createdAt: string;
  coordinates?: ModelCoordinates | null;
  modelJob?: ModelJobSnapshot | null;
};

export type ModelLifecycleStatus = 'ready' | 'pending' | 'failed';

export function getModelLifecycleStatus(model: ModelSummary): ModelLifecycleStatus {
  const status = model.modelJob?.status;

  if (status === 'queued' || status === 'running') return 'pending';
  if (status === 'failed') return 'failed';
  return 'ready';
}
