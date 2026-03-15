import { computed, shallowRef } from 'vue';
import { use3dModel } from '../useModel';
import type { ModelSummary } from '../../domain/ModelSummary';

export type IslandModelPlacement = {
  id: string;
  title: string;
  coordinates: ModelSummary['coordinates'];
  assetUrl: string | null;
};

function toIslandModelPlacement(model: ModelSummary): IslandModelPlacement {
  return {
    id: model.id,
    title: model.title,
    coordinates: model.coordinates,
    assetUrl: null,
  };
}

function createIslandModelCatalogStore() {
  const placements = shallowRef<IslandModelPlacement[]>([]);
  const isLoading = shallowRef(false);
  const error = shallowRef<string | null>(null);
  const hasLoadedOnce = shallowRef(false);
  let loadPromise: Promise<void> | null = null;
  const { getPublicModelCatalog } = use3dModel();

  async function load() {
    const library = await getPublicModelCatalog();
    placements.value = library.models.map(toIslandModelPlacement);
    hasLoadedOnce.value = true;
  }

  async function ensureLoaded(): Promise<void> {
    if (hasLoadedOnce.value) return;
    if (loadPromise) return loadPromise;

    isLoading.value = true;
    error.value = null;

    loadPromise = load()
      .catch((err) => {
        error.value = err instanceof Error ? err.message : 'Failed to load island model catalog';
        throw err;
      })
      .finally(() => {
        isLoading.value = false;
        loadPromise = null;
      });

    return loadPromise;
  }

  function findById(modelId: string): IslandModelPlacement | null {
    return placements.value.find((placement) => placement.id === modelId) ?? null;
  }

  async function refresh(): Promise<void> {
    placements.value = [];
    hasLoadedOnce.value = false;
    await ensureLoaded();
  }

  return {
    placements,
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    isLoaded: computed(() => hasLoadedOnce.value),
    ensureLoaded,
    refresh,
    findById,
  };
}

export const islandModelCatalogStore = createIslandModelCatalogStore();

export function useIslandModelCatalog() {
  return islandModelCatalogStore;
}
