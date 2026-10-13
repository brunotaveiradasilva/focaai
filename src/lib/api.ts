// Client for the FocaAI API (repo focaai-api). Sends the access token and the device's time zone
// on every call, and swaps an expired access token for a new one with the refresh token.
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

export type ApiUser = { id: string; email: string; name: string | null; picture: string | null };

type Tokens = { accessToken: string; refreshToken: string; expiresAt: number };

type LoginResponse = { accessToken: string; refreshToken: string; expiresIn: number; user: ApiUser };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Session storage: Keychain/Keystore on the phone, localStorage on the web.
// ---------------------------------------------------------------------------

const KEY = 'focaai-session';

type Stored = { tokens: Tokens; user: ApiUser };

async function readStored(): Promise<Stored | null> {
  try {
    const raw = Platform.OS === 'web' ? localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

async function writeStored(value: Stored | null) {
  try {
    if (Platform.OS === 'web') {
      if (value) localStorage.setItem(KEY, JSON.stringify(value));
      else localStorage.removeItem(KEY);
    } else if (value) {
      await SecureStore.setItemAsync(KEY, JSON.stringify(value));
    } else {
      await SecureStore.deleteItemAsync(KEY);
    }
  } catch {
    // Not persisted: the session lasts until the app is closed.
  }
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

let session: Stored | null = null;
let refreshing: Promise<boolean> | null = null;
let onExpired: () => void = () => {};

/** Called when the refresh token is rejected too: the user has to sign in again. */
export function onSessionExpired(handler: () => void) {
  onExpired = handler;
}

async function keep(login: LoginResponse) {
  session = {
    tokens: {
      accessToken: login.accessToken,
      refreshToken: login.refreshToken,
      // Renew a little early so a call never leaves with a token about to expire.
      expiresAt: Date.now() + (login.expiresIn - 30) * 1000,
    },
    user: login.user,
  };
  await writeStored(session);
}

/** Session saved on the device from a previous launch, if any. */
export async function restoreSession(): Promise<ApiUser | null> {
  session = await readStored();
  return session?.user ?? null;
}

export async function clearSession() {
  session = null;
  await writeStored(null);
}

/** Only one renewal at a time: concurrent calls wait for the same new token. */
function refresh(): Promise<boolean> {
  refreshing ??= (async () => {
    const token = session?.tokens.refreshToken;
    if (!token) return false;
    try {
      const res = await fetch(`${API_URL}/api/auth/renovar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: token }),
      });
      if (!res.ok) return false;
      await keep(await res.json());
      return true;
    } catch {
      // Offline: keep the session and let the call fail as a network error.
      return true;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

const timeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
};

type Options = { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown; auth?: boolean };

export async function api<T = void>(path: string, { method = 'GET', body, auth = true }: Options = {}): Promise<T> {
  if (auth && session && Date.now() >= session.tokens.expiresAt) await refresh();

  const send = () => {
    const headers: Record<string, string> = {};
    const tz = timeZone();
    if (tz) headers['X-Timezone'] = tz;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth && session) headers.Authorization = `Bearer ${session.tokens.accessToken}`;
    return fetch(`${API_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  };

  let res = await send();
  if (res.status === 401 && auth && session) {
    if (await refresh()) res = await send();
    if (res.status === 401) {
      await clearSession();
      onExpired();
    }
  }
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new ApiError(res.status, error?.erro ?? `Erro ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

/** Exchanges the Google ID token for the API's own tokens. */
export async function signInWithGoogle(idToken: string): Promise<ApiUser> {
  const login = await api<LoginResponse>('/api/auth/google', { method: 'POST', body: { idToken }, auth: false });
  await keep(login);
  return login.user;
}

/**
 * Local API only (`./mvnw spring-boot:test-run` in focaai-api): signs in without Google, to use the
 * app before the OAuth client IDs exist. The endpoint doesn't exist in a published API.
 */
export const devSignInEnabled = __DEV__ && process.env.EXPO_PUBLIC_DEV_LOGIN === '1';

export async function signInForDevelopment(): Promise<ApiUser> {
  const login = await api<LoginResponse>('/api/auth/dev', {
    method: 'POST',
    body: { email: 'aluno.teste@example.com', name: 'Aluno Teste' },
    auth: false,
  });
  await keep(login);
  return login.user;
}

export async function signOut() {
  const token = session?.tokens.refreshToken;
  await clearSession();
  if (token) {
    // Best effort: ends the session on the server too; signing out works offline anyway.
    await api('/api/auth/sair', { method: 'POST', body: { refreshToken: token }, auth: false }).catch(() => {});
  }
}

export async function deleteAccount() {
  await api('/api/eu', { method: 'DELETE' });
  await clearSession();
}
