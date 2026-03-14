const DEFAULT_API_BASE_URL = 'http://localhost:3000';

function normalizeUrl(value: string | undefined, fallback: string) {
  const url = (value ?? '').trim();
  return url || fallback;
}

const apiBaseUrl = normalizeUrl(import.meta.env.VITE_API_BASE_URL, DEFAULT_API_BASE_URL);

export const runtimeConfig = {
  apiBaseUrl,
  socketUrl: apiBaseUrl,
};
