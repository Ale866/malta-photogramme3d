<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { runtimeConfig } from '@/core/config/runtime'
import ModelPreviewViewport from '@/features/model/components/ModelPreviewViewport.vue'
import { ModelApi, type ModelOrientationInput } from '@/features/model/infrastructure/api'

type EvaluationSlide = {
  id: string
  title: string
  subtitle?: string | null
  meshUrl?: string | null
  textureUrl?: string | null
  orientation?: ModelOrientationInput | null
}

const initialSlides: EvaluationSlide[] = [
  createEvaluationSlide('69e11f56d1799ed3a6eb0a00', 1),
  createEvaluationSlide('69e31f05ea21eb4c0166d41e', 2),
  createEvaluationSlide('69e455c093e3cc3df5fef827', 3),
  createEvaluationSlide('69e4ec2b8a41499b0ccf94a7', 4),
  createEvaluationSlide('69e551e2080892e9a0b868c5', 5),
  createEvaluationSlide('69e573a4080892e9a0b8ac50', 6),
  createEvaluationSlide('69e59b41080892e9a0b8fb8d', 7),
  createEvaluationSlide('69e5def3080892e9a0b93d70', 8),
  createEvaluationSlide('69e610c6080892e9a0b9a0e4', 9),
  createEvaluationSlide('69e63c0a080892e9a0b9d43a', 10),
]

const defaultSlide = initialSlides[0] as EvaluationSlide
const slides = ref<EvaluationSlide[]>(initialSlides)
const currentIndex = ref(0)
const currentSlide = computed<EvaluationSlide>(() => slides.value[currentIndex.value] ?? defaultSlide)
const totalSlides = computed(() => slides.value.length)

function goToPrevious() {
  currentIndex.value = (currentIndex.value - 1 + totalSlides.value) % totalSlides.value
}

function goToNext() {
  currentIndex.value = (currentIndex.value + 1) % totalSlides.value
}

function createEvaluationSlide(modelId: string, index: number): EvaluationSlide {
  return {
    id: modelId,
    title: `Model ${index}`,
    meshUrl: toApiAssetUrl(`/model/${modelId}/mesh`),
    textureUrl: toApiAssetUrl(`/model/${modelId}/texture`),
  }
}

function toApiAssetUrl(pathname: string) {
  const apiBaseUrl = runtimeConfig.apiBaseUrl.trim()
  if (!apiBaseUrl) {
    return pathname
  }

  return new URL(pathname, ensureTrailingSlash(apiBaseUrl)).toString()
}

function ensureTrailingSlash(value: string) {
  return value.endsWith('/') ? value : `${value}/`
}

onMounted(async () => {
  const resolvedSlides = await Promise.all(
    slides.value.map(async (slide) => {
      if (!slide.meshUrl) return slide

      try {
        const model = await ModelApi.getPublicModelById(slide.id)
        return {
          ...slide,
          subtitle: model.title || null,
          orientation: model.orientation,
        }
      } catch {
        return slide
      }
    }),
  )

  slides.value = resolvedSlides
})

</script>

<template>
  <main class="evaluation-page">
    <div class="evaluation-shell">
      <p class="evaluation-page-indicator" aria-live="polite">{{ currentIndex + 1 }} / {{ totalSlides }}</p>

      <header class="evaluation-header">
        <p class="evaluation-eyebrow">Evaluation</p>
        <h1 class="evaluation-title">{{ currentSlide.title }}</h1>
        <p v-if="currentSlide.subtitle" class="evaluation-subtitle">{{ currentSlide.subtitle }}</p>
      </header>

      <section class="evaluation-stage">
        <button class="btn btn-icon evaluation-arrow evaluation-arrow--left" type="button" aria-label="Previous model" @click="goToPrevious">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <div class="evaluation-preview-frame">
          <model-preview-viewport
            :key="currentSlide.id"
            :interactive="true"
            :show-overlay="false"
            :mesh-url="currentSlide.meshUrl ?? null"
            :texture-url="currentSlide.textureUrl ?? null"
            :orientation="currentSlide.orientation ?? null"
            loading-label="Loading evaluation model"
          />
        </div>

        <button class="btn btn-icon evaluation-arrow evaluation-arrow--right" type="button" aria-label="Next model" @click="goToNext">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </section>
    </div>
  </main>
</template>
