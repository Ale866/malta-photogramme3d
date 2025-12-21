import { ref, onMounted, defineComponent } from 'vue'

export default defineComponent({
  name: 'SearchBar',
  setup(_, { emit }) {
    const query = ref<SearchEntry>(null!)
    const results = ref<(SearchEntry & { score: number })[]>([])
    const inputText = ref('')

    let timer: number | null = null

    onMounted(() => loadSearchIndex())

    function onInput() {
      if (timer) clearTimeout(timer)

      timer = window.setTimeout(() => {
        results.value = autocomplete(inputText.value)
      }, 300)
    }

    function select(entry?: SearchEntry) {
      if (!entry && results.value[0]) query.value = results.value[0]
      else {
        query.value = entry!
        inputText.value = query.value.name
      }
      results.value = []

      if (query.value) {
        console.log(query.value.lat, query.value.lon);
      }

      emit('search-selected', query.value)
    }

    let index: SearchEntry[] = []
    let loaded = false

    async function loadSearchIndex() {
      if (loaded) return

      const res = await fetch('/search/malta_search_index.json')
      index = await res.json()
      loaded = true
    }

    function autocomplete(query: string) {
      const q = normalize(query)
      if (q.length < 2) return []

      const tokens = q.split(' ')

      return index
        .map(entry => {
          const name = normalize(entry.name)
          let score = 0

          for (const t of tokens) {
            if (name.startsWith(t)) score += 5
            else if (name.includes(t)) score += 2
          }

          score -= entry.rank ?? 0
          return score > 0 ? { ...entry, score } : null
        })
        .filter((e) => e != null)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
    }

    function normalize(str: string) {
      return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    }

    return {
      query,
      results,
      inputText,
      onInput,
      select
    }
  }
})