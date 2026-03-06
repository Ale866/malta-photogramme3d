<script setup lang="ts">
import type { ModelCardViewModel } from '@/features/model/application/presenters/modelCardPresenter';

const props = defineProps<{ card: ModelCardViewModel }>();

const emit = defineEmits<{
  (event: 'open-details', modelId: string): void;
  (event: 'view-on-island', modelId: string): void;
}>();

const openDetails = () => {
  if (props.card.type !== 'model') return;
  emit('open-details', props.card.id);
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
  <article
    class="model-list-card"
    :class="`model-list-card--${card.status}`"
    :role="card.type === 'model' ? 'link' : 'article'"
    :tabindex="card.type === 'model' ? 0 : -1"
    :aria-disabled="card.type === 'model' ? 'false' : 'true'"
    @click="openDetails"
  >
    <header class="model-list-card-header">
      <h2 class="model-list-card-title">{{ card.title }}</h2>
      <span class="model-list-card-status">{{ statusLabelByStatus[card.status] }}</span>
    </header>

    <div class="model-list-card-preview">{{ card.modelPlaceholderLabel }}</div>

    <dl class="model-list-card-meta">
      <div>
        <dt>Coordinates / Location</dt>
        <dd>{{ card.coordinatesOrLocationLabel }}</dd>
      </div>
      <div>
        <dt>Date</dt>
        <dd>{{ card.date }}</dd>
      </div>
      <div v-if="card.pendingHint">
        <dt>Status detail</dt>
        <dd>{{ card.pendingHint }}</dd>
      </div>
    </dl>

    <button class="btn btn-primary" type="button" :disabled="card.type !== 'model'" @click.stop="viewOnIsland">
      View on island
    </button>
  </article>
</template>
