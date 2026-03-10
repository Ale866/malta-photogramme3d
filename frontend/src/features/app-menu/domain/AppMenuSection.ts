export type AppMenuSectionId = 'island' | 'model-list' | 'model-catalog'

export type AppMenuRouteName = 'Island' | 'ListModel' | 'ModelCatalog'

export interface AppMenuSection {
  id: AppMenuSectionId
  label: string
  routeName: AppMenuRouteName
  activeRouteNames: readonly string[]
}

export const APP_MENU_SECTIONS: readonly AppMenuSection[] = [
  {
    id: 'island',
    label: 'Island',
    routeName: 'Island',
    activeRouteNames: ['Island'],
  },
  {
    id: 'model-list',
    label: 'My models',
    routeName: 'ListModel',
    activeRouteNames: ['ListModel'],
  },
  {
    id: 'model-catalog',
    label: 'Catalog',
    routeName: 'ModelCatalog',
    activeRouteNames: ['ModelCatalog'],
  },
]
