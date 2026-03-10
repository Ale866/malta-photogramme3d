<script setup lang="ts">
import { useAppMenu } from '../application/useAppMenu'

const { items } = useAppMenu()
</script>

<template>
  <nav class="app-menu" aria-label="Primary">
    <div class="app-menu-surface">
      <router-link
        v-for="item in items"
        :key="item.id"
        class="app-menu-link"
        :class="{ 'app-menu-link--active': item.isActive }"
        :to="item.to"
      >
        {{ item.label }}
      </router-link>
    </div>
  </nav>
</template>
