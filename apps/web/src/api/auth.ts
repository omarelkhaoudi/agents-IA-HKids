import { apiRequest, clearTokens, setTokens } from './client';
import type { AuthTokens, AuthUser, LoginPayload } from '../types/auth';

export async function login(payload: LoginPayload): Promise<AuthTokens> {
  const result = await apiRequest<AuthTokens>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  setTokens(result.accessToken, result.refreshToken);
  return result;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const result = await apiRequest<{ user: AuthUser }>('/api/auth/me');
  return result.user;
}

export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem('hkids_refresh_token');

  try {
    if (refreshToken) {
      await apiRequest('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    }
  } finally {
    clearTokens();
  }
}
