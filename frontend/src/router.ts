import { createWebHistory, createRouter } from 'vue-router'
import { authStore } from './features/auth/application/useAuth'

const IslandView = () => import('@/features/island/views/IslandView.vue')
const LoginView = () => import('@/features/auth/views/LoginView.vue')

const ListModelView = () => import('@/features/model/views/ListModelView.vue')
const ModelDetailsView = () => import('@/features/model/views/ModelDetailsView.vue')

const routes = [
  { path: '/', name: "Island", component: IslandView },
  {
    path: '/model',
    children: [
      {
        path: 'list',
        name: "ListModel",
        meta: {
          requiresAuth: true,
          modelSource: 'private',
          title: 'My models',
        },
        component: ListModelView,
      },
      {
        path: 'catalog',
        name: "ModelCatalog",
        meta: {
          modelSource: 'public',
          title: 'All models',
        },
        component: ListModelView,
      },
      { path: ':modelId', name: "ModelDetails", meta: { requiresAuth: true }, component: ModelDetailsView },
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

  if (authStore.isAuthenticated.value) return true

  await authStore.hydrateSession()
  if (authStore.isAuthenticated.value) {
    return true
  }

  return {
    path: '/login',
    query: { next: to.fullPath },
  }
})
