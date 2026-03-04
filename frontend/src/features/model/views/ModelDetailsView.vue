<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const modelId = computed(() => String(route.params.modelId ?? ''));
</script>

<template>
  <section class="model-details-placeholder">
    <h1>Model details</h1>
    <p><strong>Model ID:</strong> {{ modelId }}</p>
    <button class="btn" type="button" @click="router.push({ name: 'ListModel' })">
      Back to list
    </button>
  </section>
</template>
