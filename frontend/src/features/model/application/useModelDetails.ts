import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { use3dModel } from '@/features/model/application/useModel'
import { useModelJobTracker } from '@/features/model/application/useModelJobTracker'
import type { ModelJobDetails } from '@/features/model/domain/ModelJobDetails'
import { applyVoteStateToModel, canRenderModelOnIsland, type ModelSummary, type ModelVoteState } from '@/features/model/domain/ModelSummary'

type DetailMode = 'job' | 'model'

export function useModelDetails() {
  const route = useRoute()
  const router = useRouter()
  const { getPublicModelById, getUserModelById, getModelJobDetails, rerunFailedModelJob, rerunCompletedModel } = use3dModel()
  const {
    job: liveJobSnapshot,
    trackingError,
    start: startTracking,
    stop: stopTracking,
  } = useModelJobTracker()

  const modelDetails = ref<ModelSummary | null>(null)
  const jobDetails = ref<ModelJobDetails | null>(null)
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)
  const retryError = ref<string | null>(null)
  const isRetrying = ref(false)
  const modelRerunError = ref<string | null>(null)
  const isModelRerunning = ref(false)

  const detailMode = computed<DetailMode>(() => route.name === 'ModelJobDetails' ? 'job' : 'model')
  const detailSource = computed<'catalog' | 'list'>(() => route.query.from === 'catalog' ? 'catalog' : 'list')
  const modelId = computed(() => String(route.params.modelId ?? ''))
  const jobId = computed(() => String(route.params.jobId ?? ''))

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
      modelDetails.value = null
      errorMessage.value = 'Missing model ID'
      return
    }

    modelDetails.value = detailSource.value === 'catalog'
      ? await getPublicModelById(currentModelId)
      : await getUserModelById(currentModelId)
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
    retryError.value = null
    modelRerunError.value = null
    stopTracking()
    liveJobSnapshot.value = null

    try {
      if (detailMode.value === 'job') {
        modelDetails.value = null
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
    if (!modelDetails.value) return

    modelDetails.value = applyVoteStateToModel(modelDetails.value, voteState)
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

  async function retryCurrentJob() {
    const currentJobId = jobId.value.trim()
    if (!currentJobId) {
      retryError.value = 'Missing job ID'
      return
    }

    isRetrying.value = true
    retryError.value = null

    try {
      await rerunFailedModelJob(currentJobId)
      await loadJobDetails()
    } catch (error) {
      retryError.value = error instanceof Error ? error.message : 'Could not start the retry'
    } finally {
      isRetrying.value = false
    }
  }

  async function rerunCurrentModel() {
    const currentModel = modelDetails.value
    if (!currentModel) {
      modelRerunError.value = 'Missing model'
      return
    }

    isModelRerunning.value = true
    modelRerunError.value = null

    try {
      const result = await rerunCompletedModel(currentModel.id)
      await router.replace({
        name: 'ModelJobDetails',
        params: { jobId: result.jobId },
        query: { from: 'list' },
      })
    } catch (error) {
      modelRerunError.value = error instanceof Error ? error.message : 'Could not start the rerun'
    } finally {
      isModelRerunning.value = false
    }
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
    modelDetails: computed(() => modelDetails.value),
    liveJobDetails,
    trackingError,
    errorMessage,
    retryError,
    modelRerunError,
    isLoading,
    isRetrying,
    isModelRerunning,
    applyVoteState,
    setError,
    goBack,
    openGeneratedModel,
    openGeneratedModelOnIsland,
    openCurrentModelOnIsland,
    retryCurrentJob,
    rerunCurrentModel,
  }
}
