import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { use3dModel } from '@/features/model/application/useModel'
import { useModelLibraryAutoRefresh } from '@/features/model/application/useModelLibraryAutoRefresh'
import { useModelVoting } from '@/features/model/application/useModelVoting'
import { toModelLibraryCardViewModels, type ModelCardViewModel } from '@/features/model/application/presenters/modelCardPresenter'
import type { ModelLibrary } from '@/features/model/domain/ModelLibrary'

export function useModelListPage() {
  const route = useRoute()
  const router = useRouter()
  const { getModelLibrary, getPublicModelCatalog } = use3dModel()

  const library = ref<ModelLibrary | null>(null)
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  const modelSource = computed(() => route.meta.modelSource as 'private' | 'public' | undefined)
  const pageTitle = computed(() => typeof route.meta.title === 'string' ? route.meta.title : 'Models')
  const cards = computed(() => toModelLibraryCardViewModels(library.value))
  const showVoting = computed(() => modelSource.value === 'public')
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
    void router.push({ name: 'Island', query: { modelId } })
  }

  watch(() => modelSource.value, async () => {
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
    isLoading,
    openDetails,
    pageTitle,
    showVoting,
    toggleVote: voting.toggleVote,
    isVoteDisabled: voting.isVoteDisabled,
    viewOnIsland,
  }
}
