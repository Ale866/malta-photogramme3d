<template>
  <div id="three-root"></div>
  <router-view class="router-view" />
</template>

<script setup lang="ts"></script>

<style>
#three-root {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.router-view {
  position: relative;
  z-index: 2;
}
</style>
