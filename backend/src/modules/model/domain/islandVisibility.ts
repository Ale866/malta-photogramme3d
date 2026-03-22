import type { Model } from './modelRepository';

export const MIN_ISLAND_MODEL_VOTES = 3;

export function isModelVisibleOnIsland(model: Pick<Model, 'userVotesIds'>): boolean {
  return model.userVotesIds.length >= MIN_ISLAND_MODEL_VOTES;
}
