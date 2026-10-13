import { create } from 'zustand';

// Device-only UI state. Study data lives in the API (src/lib/queries.ts).
type AppState = {
  // "Agora não" on the routine prompt at launch; lasts until the app is opened again.
  routineSkipped: boolean;
};

export const useApp = create<AppState>()(() => ({ routineSkipped: false }));
