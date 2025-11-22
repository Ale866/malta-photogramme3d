<template>
  <div id="three-root"></div>
  <router-view />
</template>

<script setup lang="ts"></script>

<style>
#three-root {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: auto;
}
</style>
