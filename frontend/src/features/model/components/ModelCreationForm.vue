<template>
  <form class="model-form" @submit.prevent="submitForm">
    <div class="form-group">
      <label for="title">Title</label>
      <input
        id="title"
        v-model="title"
        type="text"
        placeholder="Model title"
        required
      />
    </div>

    <div v-if="coordinates" class="coordinate-grid">
      <div class="coordinate-card">
        <span class="coordinate-label">Local</span>
        <p>X: {{ formatNumber(coordinates.local.x) }}</p>
        <p>Y: {{ formatNumber(coordinates.local.y) }}</p>
        <p>Z: {{ formatNumber(coordinates.local.z) }}</p>
      </div>
      <div class="coordinate-card">
        <span class="coordinate-label">UTM</span>
        <p>E: {{ formatNumber(coordinates.utm.easting) }}</p>
        <p>N: {{ formatNumber(coordinates.utm.northing) }}</p>
        <p>Alt: {{ formatNumber(coordinates.utm.altitude) }}</p>
      </div>
    </div>

    <div class="upload-area" @dragover.prevent @drop.prevent="handleDrop">
      <p>Drag and drop images here, or click to select files</p>
      <input type="file" multiple accept="image/*" @change="handleFileSelect" />
    </div>

    <div v-if="files.length > 0" class="preview-carousel">
      <button
        type="button"
        class="carousel-arrow"
        aria-label="Previous slide"
        @click="showPrevious"
      >
        &lt;
      </button>

      <div class="carousel-slide">
        <div
          class="carousel-grid"
          :style="{ '--carousel-columns': String(columnsPerSlide) }"
        >
          <div
            v-for="entry in visibleFiles"
            :key="entry.index"
            class="image-wrapper"
          >
            <img :src="entry.file.preview" alt="preview" />
            <button
              type="button"
              class="delete-icon"
              aria-label="Remove image"
              @click="removeFile(entry.index)"
            >
              x
            </button>
          </div>
        </div>
        <p class="carousel-counter">Slide {{ currentPage + 1 }} / {{ totalPages }}</p>
      </div>

      <button
        type="button"
        class="carousel-arrow"
        aria-label="Next slide"
        @click="showNext"
      >
        &gt;
      </button>
    </div>

    <button type="submit" :disabled="isSubmitting">{{ submitLabel }}</button>
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

<style scoped>
.model-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

label {
  font-weight: 600;
}

input[type="text"] {
  padding: 0.6rem 0.7rem;
  border-radius: 6px;
  border: 1px solid #5e5e5e;
  background: #262626;
  color: #fff;
}

.coordinate-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.coordinate-card {
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 0.65rem 0.75rem;
}

.coordinate-card p {
  margin: 0.2rem 0;
  font-size: 0.9rem;
}

.coordinate-label {
  display: inline-block;
  margin-bottom: 0.3rem;
  font-size: 0.8rem;
  color: #9bd2ff;
  font-weight: 700;
}

.upload-area {
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  border: 2px dashed #666;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  text-align: center;
}

.upload-area input[type="file"] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.preview-carousel {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.6rem;
  align-items: center;
}

.carousel-arrow {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid #5b5b5b;
  background: #2c2c2c;
  color: #fff;
  padding: 0;
  font-size: 1.2rem;
  line-height: 1;
}

.carousel-slide {
  min-width: 0;
}

.carousel-grid {
  display: grid;
  grid-template-columns: repeat(var(--carousel-columns, 5), minmax(0, 1fr));
  gap: 0.6rem;
}

.image-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
}

.image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
  display: block;
}

.delete-icon {
  position: absolute;
  top: -10px;
  right: -10px;
  background: #000;
  color: #ff4d4d;
  font-weight: bold;
  border-radius: 999px;
  width: 20px;
  height: 20px;
  text-align: center;
  line-height: 18px;
  cursor: pointer;
  border: 0;
  padding: 0;
}

.carousel-counter {
  margin: 0.45rem 0 0;
  text-align: center;
  font-size: 0.82rem;
  color: #c7c7c7;
}

button[type="submit"] {
  width: 100%;
  padding: 0.65rem 1rem;
  border: 0;
  border-radius: 6px;
  color: #fff;
  background: #0d79ff;
}

button[type="submit"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 700px) {
  .coordinate-grid {
    grid-template-columns: 1fr;
  }
}
</style>
