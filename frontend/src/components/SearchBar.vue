<template>
  <div class="search-container">
    <input v-model="query" @input="onInput" placeholder="Search" class="searchbar" @keyup.enter="() => select()" />

    <div v-if="results.length" class="results-container">
      <div v-for="r in results" :key="r.id" class="result-item" @click="select(r)">
        <strong class="result-name">{{ r.name }}</strong>
      </div>
    </div>
  </div>
</template>

<script lang="ts" src="./SearchBar.ts"></script>

<style scoped>
.search-container {
  position: fixed;
  top: 16px;
  left: 16px;
  width: 240px;
  z-index: 10;
  pointer-events: none;
  font-family: 'Inter', sans-serif;
}

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

.results-container {
  padding: 10px 12px;
  pointer-events: auto;
  margin-top: 6px;
  width: 100%;
  border-radius: 8px;
  background-color: rgba(30, 30, 30, 0.95);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
  max-height: 300px;
  overflow-y: auto;
}

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
