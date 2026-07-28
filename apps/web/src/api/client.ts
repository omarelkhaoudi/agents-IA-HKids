const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const ACCESS_TOKEN_KEY = 'hkids_access_token';
const REFRESH_TOKEN_KEY = 'hkids_refresh_token';

let accessToken: string | null = localStorage.getItem(ACCESS_TOKEN_KEY);
let refreshToken: string | null = localStorage.getItem(REFRESH_TOKEN_KEY);
let refreshPromise: Promise<boolean> | null = null;

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

export function setTokens(nextAccessToken: string, nextRefreshToken: string) {
  accessToken = nextAccessToken;
  refreshToken = nextRefreshToken;
  localStorage.setItem(ACCESS_TOKEN_KEY, nextAccessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken);
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Request failed.' }));
    throw new Error(errorBody.message || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) {
    return false;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          clearTokens();
          return false;
        }

        const data = (await response.json()) as {
          accessToken: string;
          refreshToken: string;
        };

        setTokens(data.accessToken, data.refreshToken);
        return true;
      } catch {
        clearTokens();
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

export async function apiRequest<T>(path: string, options: globalThis.RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const requestInit: globalThis.RequestInit = {
    ...options,
    headers,
  };

  let response = await fetch(`${API_BASE_URL}${path}`, requestInit);

  if (response.status === 401 && refreshToken && !path.startsWith('/api/auth/')) {
    const refreshed = await refreshAccessToken();

    if (refreshed && accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
      });
    }
  }

  return parseResponse<T>(response);
}

export async function apiRequestBlob(path: string, options: globalThis.RequestInit = {}): Promise<Blob> {
  const headers = new Headers(options.headers);

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && refreshToken && !path.startsWith('/api/auth/')) {
    const refreshed = await refreshAccessToken();

    if (refreshed && accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
      });
    }
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Request failed.' }));
    throw new Error(errorBody.message || `Request failed with status ${response.status}`);
  }

  return response.blob();
}
