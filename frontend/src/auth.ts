import type { User } from './shared-types';

interface DecodedToken {
  userId: string;
  username: string;
  isAdmin: boolean;
  exp: number;
}

export const AUTH_TOKEN_KEY = 'book-club-token';

export function saveAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function removeAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function decodeToken(token: string): DecodedToken | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const decoded = JSON.parse(atob(payload));
    return decoded as DecodedToken;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return true;

  const currentTime = Date.now() / 1000;
  return decoded.exp < currentTime;
}

export function getUserFromToken(token: string): User | null {
  const decoded = decodeToken(token);
  if (!decoded) return null;

  return {
    id: decoded.userId,
    username: decoded.username,
    email: '', // Not stored in JWT, would need separate API call if needed
    isAdmin: decoded.isAdmin,
  };
}

export function getValidToken(): string | null {
  const token = getAuthToken();
  if (!token) return null;

  if (isTokenExpired(token)) {
    removeAuthToken();
    return null;
  }

  return token;
}
