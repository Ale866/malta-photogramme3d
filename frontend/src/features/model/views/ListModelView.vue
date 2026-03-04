<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { use3dModel } from '@/features/model/application/useModel';
import { toModelCardViewModels } from '@/features/model/application/presenters/modelCardPresenter';
import type { ModelSummary } from '@/features/model/domain/ModelSummary';
import ModelListCard from '@/features/model/components/ModelListCard.vue';

const router = useRouter();
const { getModels } = use3dModel();

const models = ref<ModelSummary[]>([]);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);

const cards = computed(() => toModelCardViewModels(models.value));

async function loadModels() {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    models.value = await getModels();
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
    <div v-else-if="cards.length === 0" class="text-muted">No models available yet.</div>

    <div v-else class="model-list-grid">
      <ModelListCard v-for="card in cards" :key="card.id" :card="card" @open-details="openDetails"
        @view-on-island="onViewOnIsland" />
    </div>
  </section>
</template>
