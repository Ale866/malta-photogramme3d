<template>
  <div>
    {{ modelList }}
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ModelApi, type Model } from '../infrastructure/api';

const modelList = ref<Model[]>([])

onMounted(async () => {
  modelList.value = await ModelApi.getModels();
})

</script>