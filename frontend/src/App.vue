<template>
  <div id="three-root" ref="sceneRoot"></div>
  <app-menu />
  <router-view class="router-view" />
</template>

<script setup lang="ts">
import { provide, useTemplateRef } from 'vue'
import AppMenu from '@/features/app-menu/components/AppMenu.vue'

const sceneRoot = useTemplateRef<HTMLElement>('sceneRoot')

provide('sceneRoot', sceneRoot)
</script>
