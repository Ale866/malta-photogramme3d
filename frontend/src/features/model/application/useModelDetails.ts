import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { use3dModel } from '@/features/model/application/useModel'
import { islandModelCatalogStore } from '@/features/model/application/composables/useIslandModelCatalog'
import { useModelJobTracker } from '@/features/model/application/useModelJobTracker'
import type { ModelJobDetails } from '@/features/model/domain/ModelJobDetails'
import type { ModelLibrary } from '@/features/model/domain/ModelLibrary'
import { canRenderModelOnIsland, type ModelSummary, type ModelVoteState } from '@/features/model/domain/ModelSummary'

type DetailMode = 'job' | 'model'

export function useModelDetails() {
  const route = useRoute()
  const router = useRouter()
  const { getModelLibrary, getPublicModelCatalog, getModelJobDetails } = use3dModel()
  const {
    job: liveJobSnapshot,
    trackingError,
    start: startTracking,
    stop: stopTracking,
  } = useModelJobTracker()

  const library = ref<ModelLibrary | null>(null)
  const jobDetails = ref<ModelJobDetails | null>(null)
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  const detailMode = computed<DetailMode>(() => route.name === 'ModelJobDetails' ? 'job' : 'model')
  const detailSource = computed<'catalog' | 'list'>(() => route.query.from === 'catalog' ? 'catalog' : 'list')
  const modelId = computed(() => String(route.params.modelId ?? ''))
  const jobId = computed(() => String(route.params.jobId ?? ''))

  const modelDetails = computed<ModelSummary | null>(() => {
    if (detailMode.value !== 'model' || !library.value) return null
    return library.value.models.find((model) => model.id === modelId.value) ?? null
  })

  const liveJobDetails = computed<ModelJobDetails | null>(() => {
    const details = jobDetails.value
    if (!details) return null

    const snapshot = liveJobSnapshot.value
    if (!snapshot || snapshot.jobId !== details.jobId) return details

    return {
      ...details,
      ...snapshot,
    }
  })

  async function loadModelDetails() {
    const currentModelId = modelId.value.trim()
    if (!currentModelId) {
      library.value = null
      errorMessage.value = 'Missing model ID'
      return
    }

    library.value = detailSource.value === 'catalog'
      ? await getPublicModelCatalog()
      : await getModelLibrary()

    if (!library.value.models.some((model) => model.id === currentModelId)) {
      throw new Error('Model not found')
    }
  }

  async function loadJobDetails() {
    const currentJobId = jobId.value.trim()
    if (!currentJobId) {
      jobDetails.value = null
      errorMessage.value = 'Missing job ID'
      return
    }

    jobDetails.value = await getModelJobDetails(currentJobId)
    await startTracking(currentJobId)
  }

  async function loadDetails() {
    isLoading.value = true
    errorMessage.value = null
    stopTracking()
    liveJobSnapshot.value = null

    try {
      if (detailMode.value === 'job') {
        library.value = null
        await loadJobDetails()
      } else {
        jobDetails.value = null
        await loadModelDetails()
      }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to load details'
    } finally {
      isLoading.value = false
    }
  }

  function applyVoteState(voteState: ModelVoteState) {
    if (!library.value) return

    library.value = {
      ...library.value,
      models: library.value.models.map((model) =>
        model.id === voteState.modelId
          ? {
              ...model,
              voteCount: voteState.voteCount,
              hasVoted: voteState.hasVoted,
            }
          : model
      ),
    }

    const updatedModel = library.value.models.find((model) => model.id === voteState.modelId)
    if (!updatedModel) return

    islandModelCatalogStore.syncModel(updatedModel)
  }

  function setError(message: string | null) {
    errorMessage.value = message
  }

  function goBack() {
    void router.push({ name: detailSource.value === 'catalog' ? 'ModelCatalog' : 'ListModel' })
  }

  function openGeneratedModel() {
    const generatedModelId = liveJobDetails.value?.modelId
    if (!generatedModelId) return

    void router.replace({
      name: 'ModelDetails',
      params: { modelId: generatedModelId },
      query: { from: detailSource.value },
    })
  }

  function openGeneratedModelOnIsland() {
    const generatedModelId = liveJobDetails.value?.modelId
    if (!generatedModelId) return

    void router.push({ name: 'Island', query: { modelId: generatedModelId } })
  }

  function openCurrentModelOnIsland() {
    const currentModel = modelDetails.value
    if (!currentModel || !canRenderModelOnIsland(currentModel.voteCount)) return

    void router.push({ name: 'Island', query: { modelId: currentModel.id } })
  }

  watch(
    () => [detailMode.value, modelId.value, jobId.value, detailSource.value],
    async () => {
      await loadDetails()
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    stopTracking()
  })

  return {
    detailMode,
    detailSource,
    modelDetails,
    liveJobDetails,
    trackingError,
    errorMessage,
    isLoading,
    applyVoteState,
    setError,
    goBack,
    openGeneratedModel,
    openGeneratedModelOnIsland,
    openCurrentModelOnIsland,
  }
}
