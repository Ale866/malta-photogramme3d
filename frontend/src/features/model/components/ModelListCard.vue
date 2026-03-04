<script setup lang="ts">
import type { ModelCardViewModel } from '@/features/model/application/presenters/modelCardPresenter';

const props = defineProps<{ card: ModelCardViewModel }>();

const emit = defineEmits<{
  (event: 'open-details', modelId: string): void;
  (event: 'view-on-island', modelId: string): void;
}>();

const openDetails = () => emit('open-details', props.card.id);
const viewOnIsland = () => emit('view-on-island', props.card.id);
</script>

<template>
  <article class="model-list-card" :class="`model-list-card--${card.statusTone}`" role="link" tabindex="0"
    @click="openDetails">
    <header class="model-list-card-header">
      <h2 class="model-list-card-title">{{ card.title }}</h2>
      <span class="model-list-card-status">{{ card.statusLabel }}</span>
    </header>

    <div class="model-list-card-preview">{{ card.modelPlaceholderLabel }}</div>

    <dl class="model-list-card-meta">
      <div>
        <dt>Coordinates / Location</dt>
        <dd>{{ card.coordinatesOrLocationLabel }}</dd>
      </div>
      <div>
        <dt>Date</dt>
        <dd>{{ card.dateLabel }}</dd>
      </div>
      <div v-if="card.pendingHint">
        <dt>Status detail</dt>
        <dd>{{ card.pendingHint }}</dd>
      </div>
    </dl>

    <button class="btn btn-primary" type="button" @click="viewOnIsland">
      View on island
    </button>
  </article>
</template>
