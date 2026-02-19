import { createWebHistory, createRouter } from 'vue-router'
import { useAuth } from './features/auth/application/useAuth'

const IslandView = () => import('@/features/island/views/IslandView.vue')
const LoginView = () => import('@/features/auth/views/LoginView.vue')

const AddModelView = () => import('@/features/model/views/AddModelView.vue')
const ListModelView = () => import('@/features/model/views/ListModelView.vue')

const routes = [
  { path: '/', name: "Island", component: IslandView },
  {
    path: '/model',
    children: [
      { path: 'add', name: "AddModel", meta: { requiresAuth: true }, component: AddModelView },
      { path: 'list', name: "ListModel", meta: { requiresAuth: true }, component: ListModelView }
    ]
  },
  { path: '/login', name: "Login", component: LoginView },
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