<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { use3dModel } from '@/features/model/application/useModel';
import { toModelLibraryCardViewModels } from '@/features/model/application/presenters/modelCardPresenter';
import ModelListCard from '@/features/model/components/ModelListCard.vue';
import type { ModelLibrary } from '../domain/ModelLibrary';

const router = useRouter();
const { getModelLibrary } = use3dModel();

const library = ref<ModelLibrary | null>(null);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);

const cards = computed(() => toModelLibraryCardViewModels(library.value));

async function loadModels() {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    library.value = await getModelLibrary();
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
  console.log("viewmodel, ", modelId);
}

onMounted(async () => {
  await loadModels();
});
</script>

<template>
  <section class="model-list-page">
    <header class="model-list-header">
      <h1>My models</h1>
    </header>

    <div v-if="isLoading" class="text-muted">Loading models...</div>
    <div v-else-if="errorMessage" class="text-error">{{ errorMessage }}</div>
    <div v-else-if="cards.length === 0" class="text-muted">No models or active jobs available yet.</div>

    <div v-else class="model-list-grid">
      <model-list-card v-for="card in cards" :key="`${card.type}:${card.id}`" :card="card" @open-details="openDetails"
        @view-on-island="onViewOnIsland"></model-list-card>
    </div>
  </section>
</template>
