// Before the API, the app kept everything on the device (AsyncStorage, key focaai-state-v1). The first
// time an account without a profile signs in on a device that still has that data, it is sent to
// POST /api/eu/importar and removed from the device.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { api } from '@/lib/api';
import type { StudentState } from '@/lib/types';
import { migrateProgress } from '@/store/migrate-roadmap';

const KEY = 'focaai-state-v1';

type Persisted = { state?: Record<string, unknown> & { profile?: unknown; progress?: Record<string, number> }; version?: number };

async function read(): Promise<Persisted['state'] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const { state, version = 0 } = JSON.parse(raw) as Persisted;
    // v1 profiles predate the onboarding fields the API needs; the old store discarded them too.
    if (!state?.profile || version < 2) return null;
    // v3 swapped the roadmap for the content tree: old focus and frozen plans point at topics that
    // no longer exist.
    if (version < 3) return { ...state, progress: migrateProgress(state.progress ?? {}), focus: {}, plans: {} };
    return state;
  } catch {
    return null;
  }
}

export async function clearLegacyState() {
  await AsyncStorage.removeItem(KEY).catch(() => {});
}

/** Imports the device's old data into the account, if there is any. Returns the new state, or null. */
export async function importLegacyState(): Promise<StudentState | null> {
  const state = await read();
  if (!state) return null;
  const { profile, progress, focus, boost, checkins, simulados, activeSimulado, adjustments, plans, dismissed, connections, groups } =
    state;
  const imported = await api<StudentState>('/api/eu/importar', {
    method: 'POST',
    body: { profile, progress, focus, boost, checkins, simulados, activeSimulado, adjustments, plans, dismissed, connections, groups },
  });
  await clearLegacyState();
  return imported;
}
