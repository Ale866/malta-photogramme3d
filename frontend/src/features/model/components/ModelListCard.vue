<script setup lang="ts">
import type { ModelCardViewModel } from '@/features/model/application/presenters/modelCardPresenter';

const props = defineProps<{ card: ModelCardViewModel }>();

const emit = defineEmits<{
  (event: 'open-details', card: ModelCardViewModel): void;
  (event: 'view-on-island', modelId: string): void;
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
</script>

<template>
  <div class="model-list-card" :class="`model-list-card--${card.status}`" @click="openDetails">
    <header class="model-list-card-header">
      <h2 class="model-list-card-title">{{ card.title }}</h2>
      <span class="model-list-card-status">{{ statusLabelByStatus[card.status] }}</span>
    </header>

    <div class="model-list-card-preview">{{ card.modelPlaceholderLabel }}</div>

    <div class="model-list-card-meta">
      <div>
        <div>Coordinates</div>
        <div>{{ card.coordinates }}</div>
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
