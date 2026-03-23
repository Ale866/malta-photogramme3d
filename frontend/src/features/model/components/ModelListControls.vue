<script setup lang="ts">
import type { ModelListFilterKey, ModelListSortKey } from '@/features/model/application/useModelListPage'

type FilterOption = {
  key: ModelListFilterKey
  label: string
}

type SortOption = {
  key: ModelListSortKey
  label: string
}

const props = defineProps<{
  filterOptions: FilterOption[]
  selectedFilter: ModelListFilterKey
  selectedSort: ModelListSortKey
  sortOptions: SortOption[]
}>()

const emit = defineEmits<{
  'update:filter': [filterKey: ModelListFilterKey]
  'update:sort': [sortKey: ModelListSortKey]
}>()

function onSortChange(event: Event) {
  emit('update:sort', (event.target as HTMLSelectElement).value as ModelListSortKey)
}
</script>

<template>
  <div class="model-list-header-tools">
    <div class="model-list-header-toolbar">
      <label class="model-list-sort-field">
        <span class="model-list-sort-field-label">Order</span>
        <select class="model-list-sort-select" :value="props.selectedSort" @change="onSortChange">
          <option v-for="option in props.sortOptions" :key="option.key" :value="option.key">
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>

    <div class="model-list-filter-group" role="tablist" aria-label="Model list filters">
      <button v-for="option in props.filterOptions" :key="option.key" class="btn model-list-filter-button"
        :class="{ 'model-list-filter-button--active': props.selectedFilter === option.key }" type="button"
        @click="emit('update:filter', option.key)">
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
