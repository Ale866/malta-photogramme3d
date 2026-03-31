<template>
  <Teleport to="body">
    <div v-if="open" class="model-sheet-host" @click.self="close">
      <section class="model-sheet model-delete-sheet" role="dialog" aria-modal="true" :aria-label="title" @click.stop>
        <header class="model-sheet-header">
          <div class="model-delete-sheet-heading">
            <p class="model-delete-sheet-eyebrow">Permanent deletion</p>
            <h2 class="model-sheet-title">{{ title }}</h2>
          </div>
          <button type="button" class="btn btn-icon model-sheet-close" aria-label="Close popup" :disabled="isDeleting"
            @click="close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"
              stroke-linejoin="round" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </header>

        <p class="model-delete-sheet-copy">
          {{ description }}
        </p>
        <p class="model-delete-sheet-name">{{ itemTitle }}</p>
        <p v-if="errorMessage" class="text-error model-sheet-error">{{ errorMessage }}</p>

        <div class="model-delete-sheet-actions">
          <button class="btn" type="button" :disabled="isDeleting" @click="close">Cancel</button>
          <button class="btn model-delete-sheet-confirm" type="button" :disabled="isDeleting" @click="confirm">
            {{ isDeleting ? 'Deleting...' : confirmLabel }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  open: boolean
  title: string
  itemTitle: string
  description: string
  confirmLabel?: string
  errorMessage?: string | null
  isDeleting?: boolean
}>(), {
  confirmLabel: 'Yes, delete it',
  errorMessage: null,
  isDeleting: false,
})

const emit = defineEmits<{
  close: []
  confirm: []
}>()

function close() {
  if (props.isDeleting) return
  emit('close')
}

function confirm() {
  if (props.isDeleting) return
  emit('confirm')
}
</script>
