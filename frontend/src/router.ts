import { createWebHistory, createRouter } from 'vue-router'

const IslandView = () => import('@/features/island/views/IslandView.vue')
const AddModelView = () => import('@/features/model/AddModelView.vue')

const routes = [
  { path: '/', component: IslandView },
  { path: '/add-model', component: AddModelView },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
