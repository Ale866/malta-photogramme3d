<template>
  <form class="model-form" @submit.prevent="submitForm">
    <div class="form-field">
      <label class="form-label" for="title">Title</label>
      <input
        id="title"
        class="form-input"
        v-model="title"
        type="text"
        placeholder="Model title"
        required
      />
    </div>

    <div v-if="coordinates" class="model-form-coordinates">
      <div class="model-form-coord-card">
        <span class="model-form-coord-label">Local</span>
        <p>X: {{ formatNumber(coordinates.local.x) }}</p>
        <p>Y: {{ formatNumber(coordinates.local.y) }}</p>
        <p>Z: {{ formatNumber(coordinates.local.z) }}</p>
      </div>
      <div class="model-form-coord-card">
        <span class="model-form-coord-label">UTM</span>
        <p>E: {{ formatNumber(coordinates.utm.easting) }}</p>
        <p>N: {{ formatNumber(coordinates.utm.northing) }}</p>
        <p>Alt: {{ formatNumber(coordinates.utm.altitude) }}</p>
      </div>
    </div>

    <div class="model-form-upload" @dragover.prevent @drop.prevent="handleDrop">
      <p>Drag and drop images here, or click to select files</p>
      <input class="model-form-upload-input" type="file" multiple accept="image/*" @change="handleFileSelect" />
    </div>

    <div v-if="files.length > 0" class="model-form-carousel">
      <button
        type="button"
        class="btn btn-icon model-form-carousel-arrow"
        aria-label="Previous slide"
        @click="showPrevious"
      >
        &lt;
      </button>

      <div class="model-form-carousel-slide">
        <div
          class="model-form-carousel-grid"
          :style="{ '--carousel-columns': String(columnsPerSlide) }"
        >
          <div
            v-for="entry in visibleFiles"
            :key="entry.index"
            class="model-form-image-wrap"
          >
            <img class="model-form-image" :src="entry.file.preview" alt="preview" />
            <button
              type="button"
              class="model-form-delete"
              aria-label="Remove image"
              @click="removeFile(entry.index)"
            >
              x
            </button>
          </div>
        </div>
        <p class="text-muted model-form-counter">Slide {{ currentPage + 1 }} / {{ totalPages }}</p>
      </div>

      <button
        type="button"
        class="btn btn-icon model-form-carousel-arrow"
        aria-label="Next slide"
        @click="showNext"
      >
        &gt;
      </button>
    </div>

    <button class="btn btn-primary btn-block" type="submit" :disabled="isSubmitting">{{ submitLabel }}</button>
  </form>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, toRefs, watch } from 'vue'
import type { ModelCreationDraft, ModelCoordinates } from '@/features/model/domain/ModelCreationDraft'

interface UploadedFile {
  file: File
  preview: string
}

const props = withDefaults(defineProps<{
  coordinates?: ModelCoordinates | null
  isSubmitting?: boolean
  submitLabel?: string
}>(), {
  coordinates: null,
  isSubmitting: false,
  submitLabel: 'Submit',
})

const { coordinates, isSubmitting, submitLabel } = toRefs(props)

const emit = defineEmits<{
  submit: [payload: ModelCreationDraft]
}>()

const title = ref('')
const files = ref<UploadedFile[]>([])
const currentPage = ref(0)
const viewportWidth = ref(1024)

const columnsPerSlide = computed(() => {
  if (viewportWidth.value <= 420) return 2
  if (viewportWidth.value <= 700) return 3
  return 5
})

const itemsPerSlide = computed(() => columnsPerSlide.value)

const totalPages = computed(() =>
  Math.max(1, Math.ceil(files.value.length / itemsPerSlide.value))
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

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files) return

  Array.from(input.files).forEach(file => {
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

  input.value = ''
}

const handleDrop = (event: DragEvent) => {
  if (!event.dataTransfer?.files) return
  Array.from(event.dataTransfer.files).forEach(file => {
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

const removeFile = (index: number) => {
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

const showPrevious = () => {
  if (totalPages.value <= 1) return
  currentPage.value = (currentPage.value - 1 + totalPages.value) % totalPages.value
}

const showNext = () => {
  if (totalPages.value <= 1) return
  currentPage.value = (currentPage.value + 1) % totalPages.value
}

const formatNumber = (value: number) => value.toFixed(3)

const submitForm = () => {
  const sanitizedTitle = title.value.trim()
  if (!sanitizedTitle || files.value.length === 0) return

  emit('submit', {
    title: sanitizedTitle,
    files: files.value.map(f => f.file),
    coordinates: props.coordinates ?? null,
  })
}
</script>
