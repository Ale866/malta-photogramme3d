<template>
  <form class="model-form" @submit.prevent="submitForm">
    <div class="form-field">
      <label class="form-label" for="title">Title</label>
      <input id="title" class="form-input" v-model="title" type="text" placeholder="Model title" required />
    </div>

    <div v-if="coordinates" class="model-form-coordinates">
      {{ coordinates.x }}, {{ coordinates.y }}, {{ coordinates.z }}
    </div>

    <div class="model-form-upload" @dragover.prevent @drop.prevent="handleDrop">
      <div class="model-form-upload-copy">
        <span class="model-form-upload-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
            stroke-linejoin="round">
            <path d="M12 16V5" />
            <path d="m7.5 9.5 4.5-4.5 4.5 4.5" />
            <path d="M5 19h14" />
          </svg>
        </span>
        <p class="model-form-upload-title">Add reconstruction images</p>
        <p class="model-form-upload-hint">Drag and drop images here, or click to browse files.</p>
        <p v-if="files.length > 0" class="model-form-upload-count">
          {{ files.length }} {{ files.length === 1 ? 'image selected' : 'images selected' }}
        </p>
      </div>
      <input class="model-form-upload-input" type="file" multiple accept="image/*" @change="handleFileSelect" />
    </div>

    <div v-if="files.length > 0" class="model-form-carousel">
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
              <button type="button" class="model-form-delete" aria-label="Remove image"
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

    <button class="btn btn-primary btn-block" type="submit" :disabled="isSubmitting">{{ submitLabel }}</button>
  </form>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, toRefs, watch } from 'vue'
import type { ModelCreationDraft } from '@/features/model/domain/ModelCreationDraft'

interface UploadedFile {
  file: File
  preview: string
}

const props = withDefaults(defineProps<{
  coordinates: { x: number, y: number, z: number }
  isSubmitting?: boolean
  submitLabel?: string
}>(), {
  coordinates: () => ({ x: 0, y: 0, z: 0 }),
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

const goToPage = (page: number) => {
  if (page < 0 || page >= totalPages.value) return
  currentPage.value = page
}

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
