import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { use3dModel } from '@/features/model/application/useModel'
import { useModelJobTracker } from '@/features/model/application/useModelJobTracker'
import type { ModelJobDetails } from '@/features/model/domain/ModelJobDetails'
import type { ModelLibrary } from '@/features/model/domain/ModelLibrary'
import type { ModelSummary } from '@/features/model/domain/ModelSummary'

type DetailMode = 'job' | 'model'

function formatCoordinates(coordinates: { x: number; y: number; z: number } | null | undefined) {
  if (!coordinates) return 'Not available'
  return `${coordinates.x}, ${coordinates.y}, ${coordinates.z}`
}

function formatDate(value: string) {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}

function formatOptionalDate(value: string | undefined) {
  if (!value) return 'Not available'
  return formatDate(value)
}

export function useModelDetails() {
  const route = useRoute()
  const router = useRouter()
  const { getModelLibrary, getModelJobDetails } = use3dModel()
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
    if (!snapshot || snapshot.jobId !== details.jobId) {
      return details
    }

    return {
      ...details,
      ...snapshot,
    }
  })

  const detailTitle = computed(() => {
    if (detailMode.value === 'job') {
      return liveJobDetails.value?.title ?? 'Pipeline details'
    }

    return modelDetails.value?.title ?? 'Model details'
  })

  const detailSubtitle = computed(() => {
    if (detailMode.value === 'job') {
      const details = liveJobDetails.value
      if (!details) return null
      return details.status === 'succeeded'
        ? 'Processing completed. The generated model is ready.'
        : 'Live pipeline updates for this processing job.'
    }

    return 'Saved model information.'
  })

  const canOpenGeneratedModel = computed(() => {
    return detailMode.value === 'job' && Boolean(liveJobDetails.value?.modelId)
  })

  async function loadModelDetails() {
    const currentModelId = modelId.value.trim()
    if (!currentModelId) {
      library.value = null
      errorMessage.value = 'Missing model ID'
      return
    }

    library.value = await getModelLibrary()
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

  function goBack() {
    void router.push({ name: 'ListModel' })
  }

  function openGeneratedModel() {
    const generatedModelId = liveJobDetails.value?.modelId
    if (!generatedModelId) return

    void router.replace({ name: 'ModelDetails', params: { modelId: generatedModelId } })
  }

  function openGeneratedModelOnIsland() {
    const generatedModelId = liveJobDetails.value?.modelId
    if (!generatedModelId) return

    void router.push({ name: 'Island', query: { modelId: generatedModelId } })
  }

  watch(
    () => [detailMode.value, modelId.value, jobId.value],
    async () => {
      await loadDetails()
    },
    { immediate: true }
  )

  return {
    detailMode,
    modelDetails,
    liveJobDetails,
    detailTitle,
    detailSubtitle,
    canOpenGeneratedModel,
    trackingError,
    errorMessage,
    isLoading,
    goBack,
    openGeneratedModel,
    openGeneratedModelOnIsland,
    formatCoordinates,
    formatDate,
    formatOptionalDate,
  }
}
