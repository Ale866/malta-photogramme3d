<script setup lang="ts">
import { computed } from 'vue'
import type { ModelJobSnapshot } from '@/features/model/domain/ModelJob'

const props = withDefaults(defineProps<{
  job: ModelJobSnapshot
  title?: string
  subtitle?: string | null
}>(), {
  title: 'Processing model',
  subtitle: null,
})

const normalizedStatus = computed(() => props.job.status.toLowerCase())
</script>

<template>
  <section class="model-job-status" :class="`model-job-status--${normalizedStatus}`">
    <div class="model-job-status-header">
      <div class="model-job-status-copy">
        <p class="model-job-status-title">{{ title }}</p>
        <p v-if="subtitle" class="text-muted model-job-status-subtitle">{{ subtitle }}</p>
      </div>
      <span class="model-job-status-badge">{{ job.status }}</span>
    </div>

    <p class="text-muted model-job-status-stage">{{ job.stage }}</p>
    <p v-if="job.error" class="text-error model-job-status-error">{{ job.error }}</p>
  </section>
</template>
