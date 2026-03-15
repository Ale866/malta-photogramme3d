<template>
  <div ref="rootRef" class="search">
    <input
      v-model="inputText"
      class="form-input search-input"
      placeholder="Search"
      @keyup.enter="selectResult()"
    />

    <div v-if="results.length" class="search-results">
      <button
        v-for="result in results"
        :key="result.id"
        class="search-item"
        type="button"
        @click="selectResult(result)"
      >
        <strong class="search-item-name">{{ result.name }}</strong>
        <small class="search-item-city">{{ result.city }}</small>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

type SearchResult = SearchEntry & { score: number }

const emit = defineEmits<{
  'search-selected': [entry: SearchEntry]
}>()

const rootRef = ref<HTMLElement | null>(null)
const inputText = ref('')
const results = ref<SearchResult[]>([])

let debounceTimer: number | null = null
let searchIndexPromise: Promise<SearchEntry[]> | null = null
let skipNextSearchUpdate = false

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string): number {
  const aLen = a.length
  const bLen = b.length

  if (a === b) return 0
  if (aLen === 0) return bLen
  if (bLen === 0) return aLen

  const previousRow: number[] = Array.from({ length: bLen + 1 }, (_, index) => index)

  for (let i = 1; i <= aLen; i += 1) {
    let previousDiagonal = previousRow[0]!
    previousRow[0] = i

    for (let j = 1; j <= bLen; j += 1) {
      const current = previousRow[j]!
      const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1

      previousRow[j] = Math.min(
        previousRow[j]! + 1,
        previousRow[j - 1]! + 1,
        previousDiagonal + cost
      )

      previousDiagonal = current
    }
  }

  return previousRow[bLen]!
}

async function loadSearchIndex(): Promise<SearchEntry[]> {
  if (!searchIndexPromise) {
    searchIndexPromise = fetch('/search/malta_search_index.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load search index')
        }

        return response.json() as Promise<SearchEntry[]>
      })
      .catch((error) => {
        searchIndexPromise = null
        throw error
      })
  }

  return searchIndexPromise
}

function rankResults(entries: SearchEntry[], query: string): SearchResult[] {
  const normalizedQuery = normalize(query)
  if (normalizedQuery.length < 2) return []

  const queryTokens = normalizedQuery.split(/\s+/)

  return entries
    .map((entry) => {
      const nameTokens = normalize(entry.name).split(/\s+/)
      let score = 0

      for (const queryToken of queryTokens) {
        let bestTokenScore = 0

        for (const nameToken of nameTokens) {
          if (nameToken === queryToken) {
            bestTokenScore = Math.max(bestTokenScore, 12)
          } else if (nameToken.startsWith(queryToken)) {
            bestTokenScore = Math.max(bestTokenScore, 8)
          } else if (nameToken.includes(queryToken)) {
            bestTokenScore = Math.max(bestTokenScore, 5)
          } else {
            const distance = levenshtein(queryToken, nameToken)
            if (distance === 1) bestTokenScore = Math.max(bestTokenScore, 4)
            else if (distance === 2) bestTokenScore = Math.max(bestTokenScore, 2)
          }
        }

        score += bestTokenScore
      }

      if (score > 0 && queryTokens.length > 1) {
        score += 2
      }

      return score > 0 ? { ...entry, score } : null
    })
    .filter((entry): entry is SearchResult => entry !== null)
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
}

function clearResults() {
  results.value = []
}

function handleDocumentPointerDown(event: PointerEvent) {
  const target = event.target as Node | null
  if (!target || !rootRef.value) return
  if (rootRef.value.contains(target)) return
  clearResults()
}

function selectResult(entry = results.value[0]) {
  if (!entry) return

  skipNextSearchUpdate = true
  inputText.value = entry.name
  clearResults()
  emit('search-selected', entry)
}

watch(inputText, (value) => {
  if (debounceTimer !== null) {
    window.clearTimeout(debounceTimer)
  }

   if (skipNextSearchUpdate) {
    skipNextSearchUpdate = false
    return
  }

  if (normalize(value).length < 2) {
    clearResults()
    return
  }

  debounceTimer = window.setTimeout(async () => {
    try {
      const entries = await loadSearchIndex()
      results.value = rankResults(entries, value)
    } catch (error) {
      console.error('Failed to update search results:', error)
      clearResults()
    }
  }, 300)
})

onMounted(() => {
  window.addEventListener('pointerdown', handleDocumentPointerDown)
  void loadSearchIndex().catch((error) => {
    console.error('Failed to preload search index:', error)
  })
})

onUnmounted(() => {
  window.removeEventListener('pointerdown', handleDocumentPointerDown)
  if (debounceTimer !== null) {
    window.clearTimeout(debounceTimer)
  }
})
</script>
