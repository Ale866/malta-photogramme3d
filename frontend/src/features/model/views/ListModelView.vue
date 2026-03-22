<script setup lang="ts">
import { useModelListPage } from '@/features/model/application/useModelListPage'
import ModelListCard from '@/features/model/components/ModelListCard.vue'

const {
  cards,
  errorMessage,
  isLoading,
  openDetails,
  pageDescription,
  pageHeading,
  pageSecondaryDescription,
  showVoting,
  totalJobCount,
  totalModelCount,
  toggleVote,
  isVoteDisabled,
  viewOnIsland,
} = useModelListPage()
</script>

<template>
  <section class="model-list-page">
    <div class="model-list-shell">
      <header class="model-list-header">
        <div class="model-list-header-copy">
          <p class="model-list-heading">{{ pageHeading }}</p>
          <p class="model-list-summary">{{ pageDescription }}</p>
          <p class="model-list-summary model-list-summary--secondary">{{ pageSecondaryDescription }}</p>
        </div>

        <div class="model-list-highlights">
          <div class="model-list-highlight">
            <span class="model-list-highlight-label">Models</span>
            <strong>{{ totalModelCount }}</strong>
          </div>
          <div v-if="!showVoting" class="model-list-highlight">
            <span class="model-list-highlight-label">{{ showVoting ? 'Votes unlock island' : 'Jobs in library' }}</span>
            <strong>{{ totalJobCount }}</strong>
          </div>
        </div>
      </header>

      <div v-if="isLoading" class="text-muted">Loading models...</div>
      <div v-else-if="errorMessage" class="text-error">{{ errorMessage }}</div>
      <div v-else-if="cards.length === 0" class="text-muted">No models or model jobs available yet.</div>

      <div v-else class="model-list-grid">
        <model-list-card v-for="card in cards" :key="`${card.type}:${card.id}`" :card="card" :show-voting="showVoting"
          :vote-disabled="isVoteDisabled(card)" @open-details="openDetails" @view-on-island="viewOnIsland"
          @toggle-vote="toggleVote"></model-list-card>
      </div>
    </div>
  </section>
</template>
