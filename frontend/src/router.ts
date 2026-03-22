import { createWebHistory, createRouter } from 'vue-router'
import { authStore } from './features/auth/application/useAuth'

const IslandView = () => import('@/features/island/views/IslandView.vue')
const LoginView = () => import('@/features/auth/views/LoginView.vue')
const ForgotPasswordView = () => import('@/features/auth/views/ForgotPasswordView.vue')
const ResetPasswordView = () => import('@/features/auth/views/ResetPasswordView.vue')

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
        },
        component: ListModelView,
      },
      {
        path: 'catalog',
        name: "ModelCatalog",
        meta: {
          modelSource: 'public',
        },
        component: ListModelView,
      },
      { path: 'jobs/:jobId', name: "ModelJobDetails", meta: { requiresAuth: true, hideAppMenu: true }, component: ModelDetailsView },
      { path: ':modelId', name: "ModelDetails", meta: { requiresAuth: true, hideAppMenu: true }, component: ModelDetailsView },
    ]
  },
  { path: '/login', name: "Login", component: LoginView },
  { path: '/forgot-password', name: 'ForgotPassword', component: ForgotPasswordView },
  { path: '/reset-password', name: 'ResetPassword', component: ResetPasswordView },
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
