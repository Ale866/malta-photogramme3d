<template>
  <div class="search-container">
    <input v-model="query" @input="onInput" placeholder="Search" class="searchbar" />

    <div v-if="results.length" class="results-container">
      <div v-for="r in results" :key="r.id" class="result-item" @click="select(r)">
        <strong class="result-name">{{ r.name }}</strong>
        <small class="result-type">{{ r.type }}</small>
      </div>
    </div>
  </div>
</template>

<script lang="ts" src="./SearchBar.ts"></script>

<style scoped>
/* Container fixed top-left */
.search-container {
  position: fixed;
  top: 16px;
  left: 16px;
  width: 240px;
  z-index: 10;
  pointer-events: none;
  /* clicks only pass to children */
  font-family: 'Inter', sans-serif;
}

/* Dark search bar */
.searchbar {
  pointer-events: auto;
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: none;
  outline: none;
  font-size: 14px;
  color: #fff;
  background-color: rgba(30, 30, 30, 0.95);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
  transition: box-shadow 0.2s ease, transform 0.1s ease;
}

.searchbar::placeholder {
  color: #aaa;
}

.searchbar:focus {
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.7);
  transform: scale(1.02);
}

/* Results dropdown */
.results-container {
  pointer-events: auto;
  margin-top: 6px;
  border-radius: 8px;
  background-color: rgba(30, 30, 30, 0.95);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
  max-height: 300px;
  overflow-y: auto;
}

/* Result item styling */
.result-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.15s ease;
  color: #fff;
}

.result-item:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.result-name {
  font-weight: 500;
  font-size: 14px;
}

.result-type {
  font-size: 11px;
  color: #aaa;
  text-transform: capitalize;
}

/* Scrollbar for results container */
.results-container::-webkit-scrollbar {
  width: 6px;
}

.results-container::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.results-container::-webkit-scrollbar-track {
  background: transparent;
}
</style>
