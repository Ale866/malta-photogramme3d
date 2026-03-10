<template>
  <div id="three-root"></div>
  <app-menu />
  <router-view class="router-view" />
</template>

<script setup lang="ts">
import AppMenu from '@/features/app-menu/components/AppMenu.vue'
</script>
