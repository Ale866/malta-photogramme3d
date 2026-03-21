<script setup lang="ts">
import { useModelListPage } from '@/features/model/application/useModelListPage'
import ModelListCard from '@/features/model/components/ModelListCard.vue'

const {
  cards,
  errorMessage,
  isLoading,
  openDetails,
  pageTitle,
  showVoting,
  toggleVote,
  isVoteDisabled,
  viewOnIsland,
} = useModelListPage()
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
        :vote-disabled="isVoteDisabled(card)" @open-details="openDetails" @view-on-island="viewOnIsland"
        @toggle-vote="toggleVote"></model-list-card>
    </div>
  </section>
</template>
