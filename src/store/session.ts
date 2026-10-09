import { create } from 'zustand';

import * as account from '@/lib/api';
import { signOutOfGoogle } from '@/lib/google-sign-in';
import { clearLegacyState } from '@/lib/legacy';
import { queryClient } from '@/lib/queries';

type SessionState = {
  // 'loading' until the session saved on the device has been read.
  status: 'loading' | 'signedOut' | 'signedIn';
  user: account.ApiUser | null;
  restore: () => Promise<void>;
  signIn: (googleIdToken: string) => Promise<void>;
  signInDev: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

// Nothing from the previous account stays in memory for the next one.
const signedOut = { status: 'signedOut' as const, user: null };

export const useSession = create<SessionState>()((set) => ({
  status: 'loading',
  user: null,

  restore: async () => {
    const user = await account.restoreSession();
    set({ status: user ? 'signedIn' : 'signedOut', user });
  },

  signIn: async (googleIdToken) => {
    const user = await account.signInWithGoogle(googleIdToken);
    set({ status: 'signedIn', user });
  },

  signInDev: async () => {
    const user = await account.signInForDevelopment();
    set({ status: 'signedIn', user });
  },

  signOut: async () => {
    await account.signOut();
    await signOutOfGoogle();
    queryClient.clear();
    set(signedOut);
  },

  // Removes the account and everything in it on the server, and this device's old copy too.
  deleteAccount: async () => {
    await account.deleteAccount();
    await signOutOfGoogle();
    await clearLegacyState();
    queryClient.clear();
    set(signedOut);
  },
}));

account.onSessionExpired(() => {
  queryClient.clear();
  useSession.setState(signedOut);
});
