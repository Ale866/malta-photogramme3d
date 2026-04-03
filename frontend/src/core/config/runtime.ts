function normalizeUrl(value: string | undefined, fallback: string) {
  const url = (value ?? '').trim();
  return url || fallback;
}

const browserOrigin = typeof window !== 'undefined' ? window.location.origin : '';
const apiBaseUrl = normalizeUrl(import.meta.env.VITE_API_BASE_URL, '');
const socketUrl = normalizeUrl(import.meta.env.VITE_SOCKET_URL, apiBaseUrl || browserOrigin);

export const runtimeConfig = {
  apiBaseUrl,
  socketUrl,
};
