import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { APP_MENU_SECTIONS } from '../domain/AppMenuSection'

export function useAppMenu() {
  const route = useRoute()

  const items = computed(() => {
    const currentRouteName = typeof route.name === 'string' ? route.name : ''

    return APP_MENU_SECTIONS.map((section) => ({
      id: section.id,
      label: section.label,
      to: { name: section.routeName },
      isActive: section.activeRouteNames.includes(currentRouteName),
    }))
  })

  return {
    items,
  }
}
