<script setup lang="ts">
import { useModelListPage } from '@/features/model/application/useModelListPage'
import ModelListCard from '@/features/model/components/ModelListCard.vue'
import ModelListControls from '@/features/model/components/ModelListControls.vue'

const {
  errorMessage,
  filterOptions,
  isLoading,
  isLibraryEmpty,
  openDetails,
  pageDescription,
  pageHeading,
  pageSecondaryDescription,
  selectedFilter,
  selectedSort,
  setSelectedFilter,
  showVoting,
  sortOptions,
  toggleVote,
  updateSelectedSort,
  isVoteDisabled,
  visibleCards,
  visibleCountLabel,
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
        <model-list-controls v-if="!isLoading && !errorMessage" :filter-options="filterOptions"
          :selected-filter="selectedFilter" :selected-sort="selectedSort" :sort-options="sortOptions"
          :visible-count-label="visibleCountLabel" @update:filter="setSelectedFilter"
          @update:sort="updateSelectedSort" />
      </header>

      <div v-if="isLoading" class="text-muted">Loading models...</div>
      <div v-else-if="errorMessage" class="text-error">{{ errorMessage }}</div>
      <div v-else-if="visibleCards.length === 0" class="text-muted">
        {{ isLibraryEmpty ? 'No models or model jobs available yet.' : 'No items match the current view.' }}
      </div>

      <div v-else class="model-list-grid">
        <model-list-card v-for="card in visibleCards" :key="`${card.type}:${card.id}`" :card="card"
          :show-voting="showVoting" :vote-disabled="isVoteDisabled(card)" @open-details="openDetails"
          @view-on-island="viewOnIsland" @toggle-vote="toggleVote"></model-list-card>
      </div>
    </div>
  </section>
</template>
