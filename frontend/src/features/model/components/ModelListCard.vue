<script setup lang="ts">
import { usePlaceLabel } from '@/core/application/usePlaceLabel'
import type { ModelCardViewModel } from '@/features/model/application/presenters/modelCardPresenter';

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

function toggleVote() {
  if (props.card.type !== 'model') return
  emit('toggle-vote', props.card)
}

</script>

<template>
  <div class="model-list-card" :class="`model-list-card--${card.status}`" @click="openDetails">
    <header class="model-list-card-header">
      <h2 class="model-list-card-title">{{ card.title }}</h2>
      <span class="model-list-card-status">{{ statusLabelByStatus[card.status] }}</span>
    </header>

    <div class="model-list-card-preview">{{ card.modelPlaceholderLabel }}</div>

    <div v-if="showVoting && card.type === 'model'" class="model-list-card-votes">
      <div class="model-list-card-vote-count">
        {{ card.voteCount }} {{ card.voteCount === 1 ? 'vote' : 'votes' }}
      </div>
      <button class="btn" type="button" :disabled="voteDisabled" @click.stop="toggleVote">
        {{ card.hasVoted ? 'Remove vote' : 'Vote' }}
      </button>
    </div>

    <div class="model-list-card-meta">
      <div>
        <div>Location</div>
        <div>{{ placeLabel }}</div>
      </div>
      <div>
        <div>Date</div>
        <div>{{ card.date }}</div>
      </div>
    </div>

    <button class="btn btn-primary" type="button" :disabled="card.type !== 'model'" @click.stop="viewOnIsland">
      View on island
    </button>
  </div>
</template>
