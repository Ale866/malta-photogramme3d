<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { use3dModel } from '@/features/model/application/useModel';
import { useAuth } from '@/features/auth/application/useAuth';
import { useModelLibraryAutoRefresh } from '@/features/model/application/useModelLibraryAutoRefresh';
import { toModelLibraryCardViewModels, type ModelCardViewModel } from '@/features/model/application/presenters/modelCardPresenter';
import ModelListCard from '@/features/model/components/ModelListCard.vue';
import type { ModelLibrary } from '../domain/ModelLibrary';
import type { ModelVoteState } from '../domain/ModelSummary';

const route = useRoute();
const router = useRouter();
const auth = useAuth();
const { getModelLibrary, getPublicModelCatalog, voteForModel, unvoteForModel } = use3dModel();

const library = ref<ModelLibrary | null>(null);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);
const votingModelId = ref<string | null>(null);

const modelSource = computed(() => route.meta.modelSource as 'private' | 'public' | undefined);
const pageTitle = computed(() => typeof route.meta.title === 'string' ? route.meta.title : 'Models');
const cards = computed(() => toModelLibraryCardViewModels(library.value));
const isAuthenticated = computed(() => auth.isAuthenticated.value);
const showVoting = computed(() => modelSource.value === 'public');
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

function openDetails(card: ModelCardViewModel) {
  const from = modelSource.value === 'public' ? 'catalog' : 'list';

  if (card.type === 'job') {
    void router.push({ name: 'ModelJobDetails', params: { jobId: card.id }, query: { from } });
    return;
  }

  void router.push({ name: 'ModelDetails', params: { modelId: card.id }, query: { from } });
}

function onViewOnIsland(modelId: string) {
  router.push({ name: "Island", query: { modelId } })
}

function applyVoteStateToLibrary(voteState: ModelVoteState) {
  if (!library.value) return;

  library.value = {
    ...library.value,
    models: library.value.models.map((model) =>
      model.id === voteState.modelId
        ? {
          ...model,
          voteCount: voteState.voteCount,
          hasVoted: voteState.hasVoted,
        }
        : model
    ),
  };
}

async function onToggleVote(card: ModelCardViewModel) {
  if (card.type !== 'model' || modelSource.value !== 'public') return;
  if (votingModelId.value) return;

  votingModelId.value = card.id;
  errorMessage.value = null;

  try {
    const voteState = card.hasVoted
      ? await unvoteForModel(card.id)
      : await voteForModel(card.id);

    applyVoteStateToLibrary(voteState);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to update vote';
  } finally {
    votingModelId.value = null;
  }
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
      <model-list-card v-for="card in cards" :key="`${card.type}:${card.id}`" :card="card" :show-voting="showVoting"
        :vote-disabled="!isAuthenticated || auth.user.value?.id === card.ownerId || votingModelId === card.id"
        @open-details="openDetails" @view-on-island="onViewOnIsland" @toggle-vote="onToggleVote"></model-list-card>
    </div>
  </section>
</template>
