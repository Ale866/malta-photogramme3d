<template>
  <div class="search">
    <input v-model="inputText" class="form-input search-input" placeholder="Search" @input="onInput"
      @keyup.enter="() => select()" />

    <div v-if="results.length" class="search-results">
      <div v-for="r in results" :key="r.id" class="search-item" @click="select(r)">
        <strong class="search-item-name">{{ r.name }}</strong>
        <small class="search-item-city">{{ r.city }}</small>
      </div>
    </div>
  </div>
</template>

<script lang="ts" src="./SearchBar.ts"></script>
