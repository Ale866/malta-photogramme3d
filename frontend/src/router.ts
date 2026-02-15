import { createWebHistory, createRouter } from 'vue-router'
import { useAuth } from './features/auth/application/useAuth'

const IslandView = () => import('@/features/island/views/IslandView.vue')
const AddModelView = () => import('@/features/model/AddModelView.vue')
const LoginView = () => import('@/features/auth/views/LoginView.vue')

const routes = [
  { path: '/', name: "Island", component: IslandView },
  { path: '/add-model', name: "AddModel", meta: { requiresAuth: true }, component: AddModelView },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true

  const auth = useAuth()
  if (auth.isAuthenticated.value) return true

  try {
    await auth.refresh()
    return true
  } catch {
    return {
      path: '/login',
      query: { next: to.fullPath },
    }
  }
})