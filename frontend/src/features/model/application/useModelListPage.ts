import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { use3dModel } from '@/features/model/application/useModel'
import { useModelLibraryAutoRefresh } from '@/features/model/application/useModelLibraryAutoRefresh'
import { useModelVoting } from '@/features/model/application/useModelVoting'
import { toModelLibraryCardViewModels, type ModelCardViewModel } from '@/features/model/application/presenters/modelCardPresenter'
import type { ModelLibrary } from '@/features/model/domain/ModelLibrary'
import { canRenderModelOnIsland } from '@/features/model/domain/ModelSummary'

export type ModelListFilterKey = 'all' | 'models' | 'jobs' | 'needs-votes' | 'on-island'
export type ModelListSortKey = 'newest' | 'oldest' | 'title' | 'votes'

type FilterOption = {
  key: ModelListFilterKey
  label: string
}

type SortOption = {
  key: ModelListSortKey
  label: string
}

export function useModelListPage() {
  const route = useRoute()
  const router = useRouter()
  const { getModelLibrary, getPublicModelCatalog } = use3dModel()

  const library = ref<ModelLibrary | null>(null)
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)
  const selectedFilter = ref<ModelListFilterKey>('all')
  const selectedSort = ref<ModelListSortKey>('newest')

  const modelSource = computed(() => route.meta.modelSource as 'private' | 'public' | undefined)
  const cards = computed(() => toModelLibraryCardViewModels(library.value))
  const isLibraryEmpty = computed(() => cards.value.length === 0)
  const showVoting = computed(() => modelSource.value === 'public')
  const pageHeading = computed(() => showVoting.value ? 'Community catalog' : 'Your workspace')
  const pageDescription = computed(() =>
    showVoting.value
      ? 'Browse published reconstructions'
      : 'Track your pipeline jobs and revisit finished reconstructions'
  )
  const pageSecondaryDescription = computed(() =>
    showVoting.value
      ? 'A model needs at least 3 votes before it is placed on the island'
      : 'Open any card to inspect details, follow progress, or preview it on the island. Models become visible there from 3 votes onward'
  )
  const filterOptions = computed<FilterOption[]>(() =>
    showVoting.value
      ? [
        { key: 'all', label: 'All' },
        { key: 'needs-votes', label: 'Needs votes' },
        { key: 'on-island', label: 'On island' },
      ]
      : [
        { key: 'all', label: 'All' },
        { key: 'models', label: 'Models' },
        { key: 'jobs', label: 'Jobs' },
      ]
  )
  const sortOptions = computed<SortOption[]>(() =>
    showVoting.value
      ? [
        { key: 'newest', label: 'Newest first' },
        { key: 'votes', label: 'Most votes' },
        { key: 'title', label: 'Title A-Z' },
        { key: 'oldest', label: 'Oldest first' },
      ]
      : [
        { key: 'newest', label: 'Newest first' },
        { key: 'oldest', label: 'Oldest first' },
        { key: 'title', label: 'Title A-Z' },
      ]
  )
  const visibleCards = computed(() => {
    const filteredCards = cards.value.filter((card) => {
      if (showVoting.value) {
        if (card.type !== 'model') return false
        if (selectedFilter.value === 'needs-votes') return !canRenderModelOnIsland(card.voteCount)
        if (selectedFilter.value === 'on-island') return canRenderModelOnIsland(card.voteCount)
        return true
      }

      if (selectedFilter.value === 'models') return card.type === 'model'
      if (selectedFilter.value === 'jobs') return card.type === 'job'
      return true
    })

    return [...filteredCards].sort((left, right) => {
      switch (selectedSort.value) {
        case 'oldest':
          return parseDateValue(left.createdAt) - parseDateValue(right.createdAt)
        case 'title':
          return left.title.localeCompare(right.title, undefined, { sensitivity: 'base' })
        case 'votes':
          return right.voteCount - left.voteCount || parseDateValue(right.createdAt) - parseDateValue(left.createdAt)
        case 'newest':
        default:
          return parseDateValue(right.createdAt) - parseDateValue(left.createdAt)
      }
    })
  })
  const pendingJobIds = computed(() => {
    if (modelSource.value !== 'private' || !library.value) return []

    return library.value.modelJobs
      .filter((job) => job.status === 'queued' || job.status === 'running')
      .map((job) => job.id)
  })

  async function loadModels() {
    if (modelSource.value !== 'private' && modelSource.value !== 'public') {
      library.value = null
      errorMessage.value = 'Missing model page source'
      return
    }

    isLoading.value = true
    errorMessage.value = null

    try {
      library.value = modelSource.value === 'private'
        ? await getModelLibrary()
        : await getPublicModelCatalog()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to load models'
    } finally {
      isLoading.value = false
    }
  }

  const voting = useModelVoting({
    library,
    isVotingEnabled: showVoting,
    setErrorMessage: (message) => {
      errorMessage.value = message
    },
  })

  const autoRefresh = useModelLibraryAutoRefresh({
    onRefresh: loadModels,
  })

  function openDetails(card: ModelCardViewModel) {
    const from = modelSource.value === 'public' ? 'catalog' : 'list'

    if (card.type === 'job') {
      void router.push({ name: 'ModelJobDetails', params: { jobId: card.id }, query: { from } })
      return
    }

    void router.push({ name: 'ModelDetails', params: { modelId: card.id }, query: { from } })
  }

  function viewOnIsland(modelId: string) {
    const model = library.value?.models.find((entry) => entry.id === modelId)
    if (!model) return

    void router.push({ name: 'Island', query: { modelId } })
  }

  function setSelectedFilter(filterKey: ModelListFilterKey) {
    selectedFilter.value = filterKey
  }

  function setSelectedSort(sortKey: ModelListSortKey) {
    selectedSort.value = sortKey
  }

  function updateSelectedSort(value: string) {
    if (!sortOptions.value.some((option) => option.key === value)) return

    selectedSort.value = value as ModelListSortKey
  }

  watch(() => modelSource.value, async () => {
    selectedFilter.value = 'all'
    selectedSort.value = 'newest'
    await loadModels()
  }, { immediate: true })

  watch(
    () => pendingJobIds.value,
    async (jobIds) => {
      if (modelSource.value !== 'private') {
        autoRefresh.stop()
        return
      }

      await autoRefresh.watchJobs(jobIds)
    },
    { immediate: true }
  )

  return {
    cards,
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
    setSelectedSort,
    showVoting,
    sortOptions,
    toggleVote: voting.toggleVote,
    updateSelectedSort,
    isVoteDisabled: voting.isVoteDisabled,
    viewOnIsland,
    visibleCards,
  }
}

function parseDateValue(value: string): number {
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}
