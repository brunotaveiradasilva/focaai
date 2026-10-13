import { create } from 'zustand';

import * as account from '@/lib/api';
import { signOutOfGoogle } from '@/lib/google-sign-in';
import { useApp } from '@/store/app';

type SessionState = {
  // 'loading' until the session saved on the device has been read.
  status: 'loading' | 'signedOut' | 'signedIn';
  user: account.ApiUser | null;
  restore: () => Promise<void>;
  signIn: (googleIdToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

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

  signOut: async () => {
    await account.signOut();
    await signOutOfGoogle();
    set({ status: 'signedOut', user: null });
  },

  // Removes the account and everything in it on the server, and this device's copy too.
  deleteAccount: async () => {
    await account.deleteAccount();
    await signOutOfGoogle();
    useApp.getState().reset();
    set({ status: 'signedOut', user: null });
  },
}));

account.onSessionExpired(() => useSession.setState({ status: 'signedOut', user: null }));
