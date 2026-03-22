import { computed, shallowRef } from 'vue';
import { use3dModel } from '../useModel';
import { canRenderModelOnIsland, type ModelSummary } from '../../domain/ModelSummary';

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
  const { getIslandModelCatalog } = use3dModel();

  async function load() {
    const library = await getIslandModelCatalog();
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

  function syncModel(model: ModelSummary): void {
    const nextPlacement = canRenderModelOnIsland(model.voteCount)
      ? toIslandModelPlacement(model)
      : null;
    const existingIndex = placements.value.findIndex((placement) => placement.id === model.id);

    if (!nextPlacement) {
      if (existingIndex === -1) return;

      placements.value = placements.value.filter((placement) => placement.id !== model.id);
      return;
    }

    if (existingIndex === -1) {
      placements.value = [...placements.value, nextPlacement];
      return;
    }

    placements.value = placements.value.map((placement, index) =>
      index === existingIndex ? nextPlacement : placement
    );
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
    syncModel,
  };
}

export const islandModelCatalogStore = createIslandModelCatalogStore();

export function useIslandModelCatalog() {
  return islandModelCatalogStore;
}
