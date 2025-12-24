  <script setup lang="ts">
  import { onMounted, onBeforeUnmount } from 'vue'
  import { sceneFactory } from '@/core/three/sceneFactory'
  import SearchBar from '@/components/SearchBar.vue'
  import { latLonToUTM } from '@/utils/coordinates'

  onMounted(() => {
    const container = document.getElementById('three-root')!
    sceneFactory.init(container)
    window.addEventListener('resize', sceneFactory.resize)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', sceneFactory.resize)
  })

  function onSearchSelected(query: SearchEntry) {
    const position = latLonToUTM(query.lat, query.lon);
    const localPosition = sceneFactory.utmToLocal(position.easting, position.northing);
    sceneFactory.createMarker(localPosition)
  }

</script>

  <template>
    <search-bar @search-selected="onSearchSelected"></search-bar>
  </template>
