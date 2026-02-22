import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { router } from './router'
import { useAuth } from '@/features/auth/application/useAuth'

async function bootstrap() {
  const auth = useAuth()
  await auth.hydrateSession()

  createApp(App).use(router).mount('#app')
}

void bootstrap()
