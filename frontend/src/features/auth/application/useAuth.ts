import { shallowRef, computed } from 'vue';
import { AuthApi, type AuthResponse, type AuthUser } from '../infrastructure/api';

const accessToken = shallowRef<string | null>(null);
const accessTokenExpiresAt = shallowRef<number | null>(null);
const user = shallowRef<AuthUser | null>(null);
let refreshPromise: Promise<AuthResponse> | null = null;

function parseAccessTokenExpiry(expiresAt: string): number | null {
  const parsed = Date.parse(expiresAt);
  return Number.isNaN(parsed) ? null : parsed;
}

function setAuthenticatedState(result: AuthResponse) {
  accessToken.value = result.accessToken;
  accessTokenExpiresAt.value = parseAccessTokenExpiry(result.accessTokenExpiresAt);
  user.value = result.user;
}

function clearAuthenticatedState() {
  accessToken.value = null;
  accessTokenExpiresAt.value = null;
  user.value = null;
}

function hasValidAccessToken() {
  return !!accessToken.value
    && !!user.value
    && accessTokenExpiresAt.value !== null
    && accessTokenExpiresAt.value > Date.now();
}

export function useAuth() {
  const isAuthenticated = computed(() => hasValidAccessToken());

  async function hydrateSession() {
    if (hasValidAccessToken()) return;
    try {
      await refresh();
    } catch (err) {
      clearAuthenticatedState();
    }
  }

  async function login(email: string, password: string) {
    const result = await AuthApi.login({ email, password });
    setAuthenticatedState(result);
    return result;
  }

  async function register(email: string, password: string, nickname: string) {
    const result = await AuthApi.register({ email, password, nickname });
    setAuthenticatedState(result);
    return result;
  }

  async function refresh() {
    if (hasValidAccessToken()) {
      return {
        accessToken: accessToken.value!,
        accessTokenExpiresAt: new Date(accessTokenExpiresAt.value!).toISOString(),
        user: user.value!,
      };
    }

    if (refreshPromise) return refreshPromise;

    refreshPromise = AuthApi.refresh()
      .then((result) => {
        setAuthenticatedState(result);
        return result;
      })
      .catch((error) => {
        clearAuthenticatedState();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });

    return refreshPromise;
  }

  async function logout() {
    try {
      await AuthApi.logout();
    } finally {
      clearAuthenticatedState();
    }
  }

  function getAccessToken() {
    return hasValidAccessToken() ? accessToken.value : null;
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
