<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { use3dModel } from '@/features/model/application/useModel';
import { useModelLibraryAutoRefresh } from '@/features/model/application/useModelLibraryAutoRefresh';
import { toModelLibraryCardViewModels } from '@/features/model/application/presenters/modelCardPresenter';
import ModelListCard from '@/features/model/components/ModelListCard.vue';
import type { ModelLibrary } from '../domain/ModelLibrary';

const route = useRoute();
const router = useRouter();
const { getModelLibrary, getPublicModelCatalog } = use3dModel();

const library = ref<ModelLibrary | null>(null);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);

const modelSource = computed(() => route.meta.modelSource as 'private' | 'public' | undefined);
const pageTitle = computed(() => typeof route.meta.title === 'string' ? route.meta.title : 'Models');
const cards = computed(() => toModelLibraryCardViewModels(library.value));
const pendingJobIds = computed(() => {
  if (modelSource.value !== 'private' || !library.value) return [];

  return library.value.modelJobs
    .filter((job) => job.status === 'queued' || job.status === 'running')
    .map((job) => job.id);
});
const autoRefresh = useModelLibraryAutoRefresh({
  onRefresh: loadModels,
});

async function loadModels() {
  if (modelSource.value !== 'private' && modelSource.value !== 'public') {
    library.value = null;
    errorMessage.value = 'Missing model page source';
    return;
  }

  isLoading.value = true;
  errorMessage.value = null;

  try {
    library.value = modelSource.value === 'private'
      ? await getModelLibrary()
      : await getPublicModelCatalog();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load models';
  } finally {
    isLoading.value = false;
  }
}

function openDetails(modelId: string) {
  void router.push({ name: 'ModelDetails', params: { modelId } });
}

function onViewOnIsland(modelId: string) {
  router.push({ name: "Island", query: { modelId } })
}

watch(() => modelSource.value, async () => {
  await loadModels();
}, { immediate: true });

watch(
  () => pendingJobIds.value,
  async (jobIds) => {
    if (modelSource.value !== 'private') {
      autoRefresh.stop();
      return;
    }

    await autoRefresh.watchJobs(jobIds);
  },
  { immediate: true }
);
</script>

<template>
  <section class="model-list-page">
    <header class="model-list-header">
      <h1>{{ pageTitle }}</h1>
    </header>

    <div v-if="isLoading" class="text-muted">Loading models...</div>
    <div v-else-if="errorMessage" class="text-error">{{ errorMessage }}</div>
    <div v-else-if="cards.length === 0" class="text-muted">No models or model jobs available yet.</div>

    <div v-else class="model-list-grid">
      <model-list-card v-for="card in cards" :key="`${card.type}:${card.id}`" :card="card" @open-details="openDetails"
        @view-on-island="onViewOnIsland"></model-list-card>
    </div>
  </section>
</template>
