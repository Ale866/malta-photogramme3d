<script setup lang="ts">
import { useModelListPage } from '@/features/model/application/useModelListPage'
import ModelDeleteModal from '@/features/model/components/ModelDeleteModal.vue'
import ModelListCard from '@/features/model/components/ModelListCard.vue'
import ModelListControls from '@/features/model/components/ModelListControls.vue'

const {
  closeDeleteDialog,
  confirmDelete,
  deleteDialogDescription,
  deleteDialogTitle,
  deleteErrorMessage,
  deleteTarget,
  errorMessage,
  filterOptions,
  isLoading,
  isDeleting,
  isLibraryEmpty,
  openDetails,
  pageDescription,
  pageHeading,
  pageSecondaryDescription,
  requestDelete,
  selectedFilter,
  selectedSort,
  setSelectedFilter,
  showVoting,
  sortOptions,
  toggleVote,
  updateSelectedSort,
  isVoteDisabled,
  canShowMore,
  canShowLess,
  pagedCards,
  showLess,
  showMore,
  visibleCards,
  visibleCardCount,
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
          @update:filter="setSelectedFilter" @update:sort="updateSelectedSort" />
      </header>

      <div v-if="isLoading" class="model-list-state-shell">
        <section class="model-list-state-card model-list-state-card--loading" aria-live="polite">
          <div class="model-list-state-spinner" aria-hidden="true"></div>
          <p class="model-list-state-eyebrow">Loading</p>
          <h2 class="model-list-state-title">{{ showVoting ? 'Preparing the catalog' : 'Preparing your workspace' }}</h2>
          <p class="model-list-state-copy">
            {{ showVoting
              ? 'Fetching published reconstructions and their latest vote state.'
              : 'Fetching your reconstruction jobs and finished models.' }}
          </p>
        </section>
      </div>

      <div v-else-if="errorMessage" class="model-list-state-shell">
        <section class="model-list-state-card model-list-state-card--error" aria-live="polite">
          <div class="model-list-state-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
              stroke-linejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5" />
              <path d="M12 16h.01" />
            </svg>
          </div>
          <p class="model-list-state-eyebrow">Something went wrong</p>
          <h2 class="model-list-state-title">Unable to load this page</h2>
          <p class="model-list-state-copy text-error">{{ errorMessage }}</p>
        </section>
      </div>

      <div v-else-if="visibleCards.length === 0" class="model-list-state-shell">
        <section class="model-list-state-card" aria-live="polite">
          <div class="model-list-state-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
              stroke-linejoin="round">
              <rect x="4" y="5" width="16" height="14" rx="3" />
              <path d="M8 10h8" />
              <path d="M8 14h5" />
            </svg>
          </div>
          <p class="model-list-state-eyebrow">{{ isLibraryEmpty ? 'Nothing here yet' : 'No matches found' }}</p>
          <h2 class="model-list-state-title">
            {{ isLibraryEmpty
              ? (showVoting ? 'No catalog models yet' : 'No models or jobs yet')
              : 'No items match the current view' }}
          </h2>
          <p class="model-list-state-copy">
            {{ isLibraryEmpty
              ? (showVoting
                ? 'Published reconstructions will appear here once they are available.'
                : 'Your uploaded jobs and finished reconstructions will appear here once they are created.')
              : 'Try a different filter or sort option to broaden the current view.' }}
          </p>
        </section>
      </div>

      <div v-else class="model-list-grid">
        <model-list-card v-for="card in pagedCards" :key="`${card.type}:${card.id}`" :card="card"
          :show-voting="showVoting" :vote-disabled="isVoteDisabled(card)" @open-details="openDetails"
          @view-on-island="viewOnIsland" @toggle-vote="toggleVote" @request-delete="requestDelete"></model-list-card>
        <div v-if="canShowMore || canShowLess" class="model-list-pagination">
          <button v-if="canShowLess" class="btn model-list-show-more-button" type="button" @click="showLess">
            Show less
          </button>
          <span v-else aria-hidden="true"></span>
          <p class="model-list-pagination-count">{{ pagedCards.length }} of {{ visibleCardCount }}</p>
          <button v-if="canShowMore" class="btn model-list-show-more-button" type="button" @click="showMore">
            Show more
          </button>
          <span v-else aria-hidden="true"></span>
        </div>
      </div>
    </div>

    <model-delete-modal
      :open="Boolean(deleteTarget)"
      :title="deleteDialogTitle"
      :item-title="deleteTarget?.title ?? ''"
      :description="deleteDialogDescription"
      :error-message="deleteErrorMessage"
      :is-deleting="isDeleting"
      @close="closeDeleteDialog"
      @confirm="confirmDelete"
    />
  </section>
</template>
