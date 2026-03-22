<script setup lang="ts">
import { computed } from 'vue'
import { usePlaceLabel } from '@/core/application/usePlaceLabel'
import { MIN_ISLAND_MODEL_VOTES, canRenderModelOnIsland } from '@/features/model/domain/ModelSummary'
import type { ModelCardViewModel } from '@/features/model/application/presenters/modelCardPresenter';
import ModelPreviewViewport from '@/features/model/components/ModelPreviewViewport.vue'

const props = withDefaults(defineProps<{
  card: ModelCardViewModel;
  showVoting?: boolean;
  voteDisabled?: boolean;
}>(), {
  showVoting: false,
  voteDisabled: false,
});

const emit = defineEmits<{
  (event: 'open-details', card: ModelCardViewModel): void;
  (event: 'view-on-island', modelId: string): void;
  (event: 'toggle-vote', card: ModelCardViewModel): void;
}>();

const openDetails = () => {
  emit('open-details', props.card);
};

const viewOnIsland = () => {
  if (props.card.type !== 'model') return;
  emit('view-on-island', props.card.id);
};

const statusLabelByStatus = {
  ready: 'Ready',
  pending: 'Processing',
  failed: 'Failed',
} as const;

const { placeLabel } = usePlaceLabel(() => props.card.locationCoordinates)
const formattedDate = computed(() => {
  const parsed = Date.parse(props.card.date)
  if (Number.isNaN(parsed)) return props.card.date

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(parsed)
})

function toggleVote() {
  if (props.card.type !== 'model') return
  emit('toggle-vote', props.card)
}

function isIslandButtonDisabled(card: ModelCardViewModel): boolean {
  return card.type !== 'model' || !canRenderModelOnIsland(card.voteCount)
}

function islandButtonTitle(card: ModelCardViewModel): string | undefined {
  if (card.type !== 'model') return undefined
  if (canRenderModelOnIsland(card.voteCount)) return undefined

  return `Needs at least ${MIN_ISLAND_MODEL_VOTES} votes to appear on the island`
}

</script>

<template>
  <div class="model-list-card" :class="`model-list-card--${card.status}`" @click="openDetails">
    <header class="model-list-card-header">
      <h2 class="model-list-card-title">{{ card.title }}</h2>
      <span class="model-list-card-status">{{ statusLabelByStatus[card.status] }}</span>
    </header>

    <div class="model-list-card-preview">
      <model-preview-viewport v-if="card.type === 'model'" :interactive="false" :show-overlay="false" />
      <div v-else class="model-list-card-job-stage">
        <div class="model-list-card-job-stage-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
            stroke-linejoin="round">
            <path d="M12 2v4" />
            <path d="m16.24 7.76 2.83-2.83" />
            <path d="M18 12h4" />
            <path d="m16.24 16.24 2.83 2.83" />
            <path d="M12 18v4" />
            <path d="m4.93 19.07 2.83-2.83" />
            <path d="M2 12h4" />
            <path d="m4.93 4.93 2.83 2.83" />
          </svg>
        </div>
        <p class="model-list-card-job-stage-title">{{ card.status === 'failed' ? 'Job failed' : 'Processing job' }}</p>
        <p class="model-list-card-job-stage-copy">
          {{ card.status === 'failed' ? 'Open details to inspect the latest pipeline error.' :
            'Open details to follow progress and live job updates.' }}
        </p>
      </div>
    </div>

    <div class="model-list-card-meta">
      <div v-if="card.type === 'model' && card.ownerName" class="model-list-card-meta-item">
        <div class="model-list-card-meta-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
            stroke-linejoin="round">
            <path d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
            <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
          </svg>
        </div>
        <div>
          <div class="model-list-card-meta-label">Creator</div>
          <div class="model-list-card-meta-value">{{ card.ownerName }}</div>
        </div>
      </div>
      <div class="model-list-card-meta-item">
        <div class="model-list-card-meta-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
            stroke-linejoin="round">
            <path d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z" />
            <circle cx="12" cy="11" r="2.2" />
          </svg>
        </div>
        <div>
          <div class="model-list-card-meta-label">Location</div>
          <div class="model-list-card-meta-value">{{ placeLabel }}</div>
        </div>
      </div>
      <div class="model-list-card-meta-item">
        <div class="model-list-card-meta-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
            stroke-linejoin="round">
            <path d="M8 3v3" />
            <path d="M16 3v3" />
            <path d="M4 9h16" />
            <rect x="4" y="5" width="16" height="16" rx="2" />
          </svg>
        </div>
        <div>
          <div class="model-list-card-meta-label">Created</div>
          <div class="model-list-card-meta-value">{{ formattedDate }}</div>
        </div>
      </div>
    </div>

    <div v-if="card.type === 'model'" class="model-list-card-actions">
      <button class="btn btn-primary model-list-card-island-button"
        :class="{ 'model-list-card-island-button--solo': !showVoting }" type="button"
        :disabled="isIslandButtonDisabled(card)" :title="islandButtonTitle(card)"
        @click.stop="viewOnIsland">
        View on island
      </button>
      <button v-if="showVoting" class="btn model-list-card-vote-button"
        :class="{ 'model-list-card-vote-button--active': card.hasVoted }" type="button" :disabled="voteDisabled"
        @click.stop="toggleVote">
        <svg viewBox="0 0 24 24" :fill="card.hasVoted ? 'currentColor' : 'none'" stroke="currentColor"
          :stroke-width="card.hasVoted ? 0 : 1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 4.5 20 14h-5v6H9v-6H4z" />
        </svg>
        <span class="model-list-card-vote-value">{{ card.voteCount }}</span>
      </button>
    </div>
  </div>
</template>
