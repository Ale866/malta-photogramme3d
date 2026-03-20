import { ref, watch } from 'vue'
import type { LocalCoordinates } from '@/core/domain/Coordinates'
import { resolvePlaceLabelForLocalCoordinates } from '@/core/infrastructure/placeIndex'

export function usePlaceLabel(getCoordinates: () => LocalCoordinates | null) {
  const placeLabel = ref('Unknown area')

  watch(
    getCoordinates,
    async (coordinates) => {
      if (!coordinates) {
        placeLabel.value = 'Unknown area'
        return
      }

      placeLabel.value = 'Resolving location...'

      try {
        placeLabel.value = await resolvePlaceLabelForLocalCoordinates(coordinates)
      } catch {
        placeLabel.value = 'Unknown area'
      }
    },
    { immediate: true, deep: true }
  )

  return { placeLabel }
}
