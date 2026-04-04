<template>
  <form class="model-form" @submit.prevent="submitForm">
    <div class="form-field">
      <label class="form-label" for="title">Title</label>
      <input id="title" class="form-input" v-model="title" type="text" placeholder="Model title" :disabled="isDisabled"
        required />
    </div>

    <div v-if="coordinates" class="model-form-coordinates">
      Selected area: {{ placeLabel }}
    </div>

    <div v-if="uploadProgress && !submittedJobId" class="model-form-upload-status"
      :class="{ 'model-form-upload-status--active': isSubmitting }">
      <p class="model-form-upload-status-title">
        {{ isSubmitting ? uploadStatusTitle : 'Upload ready to retry' }}
      </p>
      <p class="model-form-upload-status-copy">
        {{ uploadProgress.type === 'video'
          ? `${uploadProgress.progressPercent}% of the video uploaded`
          : `${uploadProgress.uploadedFiles} / ${uploadProgress.totalFiles} ${uploadProgress.totalFiles === 1 ? 'image uploaded' : 'images uploaded'}` }}
      </p>
      <p v-if="isSubmitting" class="model-form-upload-status-warning">
        Upload in progress. Please do not close or refresh this page until everything is uploaded. If you close or
        refresh before it finishes, the upload is lost.
      </p>
      <p v-if="isSubmitting && uploadProgress.activeBatches > 0" class="model-form-upload-status-meta">
        {{ uploadProgress.activeBatches }} {{ uploadProgress.activeBatches === 1 ? 'batch is' : 'batches are' }} currently uploading
      </p>
      <div class="model-form-upload-progress" aria-hidden="true">
        <span :style="{ width: `${uploadProgress.progressPercent}%` }" />
      </div>
      <p class="model-form-upload-status-meta">{{ uploadProgress.progressPercent }}%</p>
    </div>

    <div v-if="submittedJobId" class="model-form-inline-success">
      <p class="model-form-inline-success-title">Model job created</p>
      <p class="model-form-inline-success-copy">You can keep inspecting the uploaded media here, or open the details
        page to follow the progress.</p>
      <button class="btn btn-primary model-form-inline-success-button" type="button" @click="openJobDetails">
        Open job details
      </button>
    </div>
    <div v-else class="model-form-upload" :class="{ 'model-form-upload--disabled': isDisabled }" role="button"
      tabindex="0" @click="openFilePicker" @keydown.enter.prevent="openFilePicker"
      @keydown.space.prevent="openFilePicker" @dragover.prevent @drop.prevent="handleDrop">
      <div class="model-form-source-toggle" @click.stop>
        <button
          type="button"
          class="model-form-source-option"
          :class="{ 'model-form-source-option--active': sourceType === 'images' }"
          :disabled="isDisabled"
          @click="setSourceType('images')"
        >
          Images
        </button>
        <button
          type="button"
          class="model-form-source-option"
          :class="{ 'model-form-source-option--active': sourceType === 'video' }"
          :disabled="isDisabled"
          @click="setSourceType('video')"
        >
          Video
        </button>
      </div>
      <div class="model-form-upload-copy">
        <span class="model-form-upload-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
            stroke-linejoin="round">
            <path d="M12 16V5" />
            <path d="m7.5 9.5 4.5-4.5 4.5 4.5" />
            <path d="M5 19h14" />
          </svg>
        </span>
        <p class="model-form-upload-title">{{ sourceType === 'video' ? 'Add reconstruction video' : 'Add reconstruction images' }}</p>
        <p class="model-form-upload-hint">
          {{ sourceType === 'video'
            ? 'Drag and drop one video here, or click to browse.'
            : 'Drag and drop images here, or click to browse files.' }}
        </p>
        <p v-if="selectionCount > 0" class="model-form-upload-count">
          {{ selectionCount }}
          {{ sourceType === 'video'
            ? selectionCount === 1 ? 'video selected' : 'videos selected'
            : selectionCount === 1 ? 'image selected' : 'images selected' }}
        </p>
      </div>
      <input ref="fileInputRef" class="model-form-upload-input" type="file" :multiple="sourceType === 'images'" :accept="fileAccept"
        :disabled="isDisabled" @change="handleFileSelect" />
    </div>

    <div v-if="sourceType === 'images' && files.length > 0" class="model-form-carousel">
      <div class="model-form-carousel-track">
        <button type="button" class="btn btn-icon model-form-carousel-arrow" aria-label="Previous slide"
          :disabled="totalPages <= 1" @click="showPrevious">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
            stroke-linejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <div class="model-form-carousel-slide">
          <div class="model-form-carousel-grid" :style="{ '--carousel-columns': String(columnsPerSlide) }">
            <div v-for="entry in visibleFiles" :key="entry.index" class="model-form-image-wrap">
              <div class="model-form-image-frame">
                <img class="model-form-image" :src="entry.file.preview" alt="preview" />
                <div class="model-form-image-overlay">
                  <span class="model-form-image-name">{{ entry.file.file.name }}</span>
                </div>
              </div>
              <button type="button" class="model-form-delete" aria-label="Remove image" :disabled="isDisabled"
                @click="removeFile(entry.index)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                  stroke-linejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <button type="button" class="btn btn-icon model-form-carousel-arrow" aria-label="Next slide"
          :disabled="totalPages <= 1" @click="showNext">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
            stroke-linejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      <div v-if="totalPages > 1" class="model-form-pagination" aria-label="Image pages">
        <button v-for="page in pageIndexes" :key="page" type="button" class="model-form-pagination-dot"
          :class="{ 'model-form-pagination-dot--active': page === currentPage }"
          :aria-label="`Go to image page ${page + 1}`" :aria-current="page === currentPage ? 'true' : undefined"
          @click="goToPage(page)" />
      </div>
    </div>

    <div v-if="sourceType === 'video' && videoFile" class="model-form-video-summary">
      <p class="model-form-video-summary-label">Selected video</p>
      <p class="model-form-video-summary-name">{{ videoFile.name }}</p>
      <p class="model-form-video-summary-meta">{{ formatBytes(videoFile.size) }}</p>
      <button type="button" class="btn btn-secondary model-form-video-summary-action" :disabled="isDisabled" @click="clearVideo">
        Remove video
      </button>
    </div>

    <button class="btn btn-primary btn-block" type="submit" :disabled="isDisabled">{{ submitLabel }}</button>
  </form>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, toRefs, watch } from 'vue'
import { usePlaceLabel } from '@/core/application/usePlaceLabel'
import type { ModelCreationDraft } from '@/features/model/domain/ModelCreationDraft'
import type { UploadProgressSnapshot } from '@/features/model/infrastructure/api'

interface UploadedFile {
  file: File
  preview: string
}

const props = withDefaults(defineProps<{
  coordinates: { x: number, y: number, z: number }
  isSubmitting?: boolean
  isLocked?: boolean
  submittedJobId?: string | null
  submitLabel?: string
  uploadProgress?: UploadProgressSnapshot | null
}>(), {
  coordinates: () => ({ x: 0, y: 0, z: 0 }),
  isSubmitting: false,
  isLocked: false,
  submittedJobId: null,
  submitLabel: 'Submit',
  uploadProgress: null,
})

const { coordinates, isSubmitting, isLocked, submittedJobId, submitLabel, uploadProgress } = toRefs(props)
const { placeLabel } = usePlaceLabel(() => coordinates.value)

const emit = defineEmits<{
  submit: [payload: ModelCreationDraft]
  openJobDetails: []
}>()

const title = ref('')
const sourceType = ref<'images' | 'video'>('images')
const files = ref<UploadedFile[]>([])
const videoFile = ref<File | null>(null)
const currentPage = ref(0)
const viewportWidth = ref(1024)
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDisabled = computed(() => isSubmitting.value || isLocked.value)
const fileAccept = computed(() => sourceType.value === 'video' ? 'video/*' : 'image/*')
const selectionCount = computed(() => sourceType.value === 'video' ? (videoFile.value ? 1 : 0) : files.value.length)
const uploadStatusTitle = computed(() => uploadProgress.value?.type === 'video' ? 'Uploading video' : 'Uploading images')

const columnsPerSlide = computed(() => {
  if (viewportWidth.value <= 420) return 2
  if (viewportWidth.value <= 700) return 3
  return 5
})

const itemsPerSlide = computed(() => columnsPerSlide.value)

const totalPages = computed(() =>
  Math.max(1, Math.ceil(files.value.length / itemsPerSlide.value))
)

const pageIndexes = computed(() =>
  Array.from({ length: totalPages.value }, (_, index) => index)
)

const visibleFiles = computed(() => {
  const start = currentPage.value * itemsPerSlide.value
  return files.value
    .slice(start, start + itemsPerSlide.value)
    .map((file, offset) => ({ file, index: start + offset }))
})

const updateViewportWidth = () => {
  viewportWidth.value = window.innerWidth
}

const openJobDetails = () => {
  emit('openJobDetails')
}

onMounted(() => {
  updateViewportWidth()
  window.addEventListener('resize', updateViewportWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateViewportWidth)
})

watch(itemsPerSlide, () => {
  const lastPage = Math.max(0, Math.ceil(files.value.length / itemsPerSlide.value) - 1)
  if (currentPage.value > lastPage) {
    currentPage.value = lastPage
  }
})

const addFiles = (selectedFiles: File[]) => {
  selectedFiles.forEach(file => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => {
      files.value.push({
        file,
        preview: e.target?.result as string,
      })
    }
    reader.readAsDataURL(file)
  })
}

const setSourceType = (nextType: 'images' | 'video') => {
  if (isDisabled.value || sourceType.value === nextType) return
  sourceType.value = nextType
  files.value = []
  videoFile.value = null
  currentPage.value = 0
}

const setVideoFile = (file: File | null) => {
  if (!file) {
    videoFile.value = null
    return
  }
  if (!file.type.startsWith('video/')) return
  videoFile.value = file
}

const openFilePicker = () => {
  if (isDisabled.value) return
  fileInputRef.value?.click()
}

const handleFileSelect = (event: Event) => {
  if (isDisabled.value) return
  const input = event.target as HTMLInputElement
  if (!input.files) return

  if (sourceType.value === 'video') {
    setVideoFile(input.files[0] ?? null)
  } else {
    addFiles(Array.from(input.files))
  }

  input.value = ''
}

const handleDrop = (event: DragEvent) => {
  if (isDisabled.value) return
  if (!event.dataTransfer?.files) return
  if (sourceType.value === 'video') {
    setVideoFile(Array.from(event.dataTransfer.files).find((file) => file.type.startsWith('video/')) ?? null)
  } else {
    addFiles(Array.from(event.dataTransfer.files))
  }
}

const removeFile = (index: number) => {
  if (isDisabled.value) return
  files.value.splice(index, 1)
  if (files.value.length === 0) {
    currentPage.value = 0
    return
  }
  const lastPage = Math.max(0, Math.ceil(files.value.length / itemsPerSlide.value) - 1)
  if (currentPage.value > lastPage) {
    currentPage.value = lastPage
  }
}

const clearVideo = () => {
  if (isDisabled.value) return
  videoFile.value = null
}

const showPrevious = () => {
  if (totalPages.value <= 1) return
  currentPage.value = (currentPage.value - 1 + totalPages.value) % totalPages.value
}

const showNext = () => {
  if (totalPages.value <= 1) return
  currentPage.value = (currentPage.value + 1) % totalPages.value
}

const goToPage = (page: number) => {
  if (page < 0 || page >= totalPages.value) return
  currentPage.value = page
}

const submitForm = () => {
  const sanitizedTitle = title.value.trim()
  if (!sanitizedTitle) return

  if (sourceType.value === 'video') {
    if (!videoFile.value) return

    emit('submit', {
      title: sanitizedTitle,
      type: 'video',
      videoFile: videoFile.value,
      coordinates: props.coordinates ?? null,
    })
    return
  }

  if (files.value.length === 0) return

  emit('submit', {
    title: sanitizedTitle,
    type: 'images',
    files: files.value.map(f => f.file),
    coordinates: props.coordinates ?? null,
  })
}

function formatBytes(size: number) {
  if (!Number.isFinite(size) || size <= 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  let value = size
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const rounded = value >= 10 || unitIndex === 0 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} ${units[unitIndex]}`
}
</script>
