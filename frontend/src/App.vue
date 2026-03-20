<template>
  <div id="three-root" ref="sceneRoot"></div>
  <app-menu v-if="showAppMenu" />
  <router-view class="router-view" />
</template>

<script setup lang="ts">
import { computed, provide, useTemplateRef } from 'vue'
import { useRoute } from 'vue-router'
import AppMenu from '@/features/app-menu/components/AppMenu.vue'

const route = useRoute()
const sceneRoot = useTemplateRef<HTMLElement>('sceneRoot')
const showAppMenu = computed(() => route.meta.hideAppMenu !== true)

provide('sceneRoot', sceneRoot)
</script>
