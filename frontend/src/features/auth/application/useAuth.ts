import { shallowRef, computed } from 'vue';
import { AuthApi, type AuthUser } from '../infrastructure/api';

const accessToken = shallowRef<string | null>(null);
const user = shallowRef<AuthUser | null>(null);
let hydratePromise: Promise<void> | null = null;

export function useAuth() {
  const isAuthenticated = computed(() => !!accessToken.value && !!user.value);

  async function hydrateSession() {
    if (isAuthenticated.value) return;
    if (hydratePromise) return hydratePromise;

    hydratePromise = (async () => {
      try {
        await refresh();
      } catch (err) { }
    })().finally(() => {
      hydratePromise = null;
    });

    return hydratePromise;
  }

  async function login(email: string, password: string) {
    const result = await AuthApi.login({ email, password });
    accessToken.value = result.accessToken;
    user.value = result.user;
    return result;
  }

  async function register(email: string, password: string, nickname: string) {
    const result = await AuthApi.register({ email, password, nickname });
    accessToken.value = result.accessToken;
    user.value = result.user;
    return result;
  }

  async function refresh() {
    const result = await AuthApi.refresh();
    accessToken.value = result.accessToken;
    user.value = result.user;
    return result;
  }

  async function logout() {
    try {
      await AuthApi.logout();
    } finally {
      accessToken.value = null;
      user.value = null;
    }
  }

  function getAccessToken() {
    return accessToken.value;
  }

  return {
    user,
    accessToken,
    isAuthenticated,
    hydrateSession,
    login,
    register,
    refresh,
    logout,
    getAccessToken,
  };
}

export async function requireAccessToken(): Promise<string> {
  const auth = useAuth();

  let token = auth.getAccessToken();
  if (token) return token;

  await auth.hydrateSession();
  token = auth.getAccessToken();

  if (!token) throw new Error("Not authenticated (missing access token)");
  return token;
}
