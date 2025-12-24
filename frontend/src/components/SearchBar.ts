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
      if (!entry && results.value[0]) {
        query.value = results.value[0]
        inputText.value = query.value.name
      }
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

    function levenshtein(a: string, b: string): number {
      const aLen = a.length
      const bLen = b.length

      if (a === b) return 0
      if (aLen === 0) return bLen
      if (bLen === 0) return aLen

      const prev: number[] = Array.from(
        { length: bLen + 1 },
        (_, i): number => i
      )

      for (let i = 1; i <= aLen; i++) {
        let prevDiagonal: number = prev[0]!
        prev[0] = i

        const aChar = a.charAt(i - 1)

        for (let j = 1; j <= bLen; j++) {
          const temp: number = prev[j]!
          const bChar = b.charAt(j - 1)

          const cost: number = aChar === bChar ? 0 : 1

          prev[j] = Math.min(
            prev[j]! + 1,
            prev[j - 1]! + 1,
            prevDiagonal + cost
          )

          prevDiagonal = temp
        }
      }
      return prev[bLen]!
    }

    function autocomplete(query: string) {
      const q = normalize(query)
      if (q.length < 2) return []

      const qTokens = q.split(/\s+/)

      return index
        .map(entry => {
          const name = normalize(entry.name)
          const nameTokens = name.split(/\s+/)

          let score = 0

          for (const qToken of qTokens) {
            let bestTokenScore = 0

            for (const nameToken of nameTokens) {
              if (nameToken === qToken) {
                bestTokenScore = Math.max(bestTokenScore, 12)
              }
              else if (nameToken.startsWith(qToken)) {
                bestTokenScore = Math.max(bestTokenScore, 8)
              }
              else if (nameToken.includes(qToken)) {
                bestTokenScore = Math.max(bestTokenScore, 5)
              }
              else {
                const dist = levenshtein(qToken, nameToken)
                if (dist === 1) bestTokenScore = Math.max(bestTokenScore, 4)
                else if (dist === 2) bestTokenScore = Math.max(bestTokenScore, 2)
              }
            }

            score += bestTokenScore
          }

          if (score > 0 && qTokens.length > 1) {
            score += 2
          }

          score = score - (entry.rank ?? 0)

          return score > 0 ? { ...entry, score } : null
        })
        .filter(e => e != null)
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