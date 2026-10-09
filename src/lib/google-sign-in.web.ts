// Google Sign-In on the web, with Google Identity Services loaded straight from Google.
// https://developers.google.com/identity/gsi/web

export const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

type CredentialResponse = { credential: string };

export type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: CredentialResponse) => void;
        auto_select?: boolean;
        ux_mode?: 'popup' | 'redirect';
      }) => void;
      renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void;
      disableAutoSelect: () => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

let loading: Promise<GoogleIdentity> | null = null;

export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  loading ??= new Promise((resolve, reject) => {
    if (window.google) return resolve(window.google);
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => (window.google ? resolve(window.google) : reject(new Error('Google Identity Services')));
    script.onerror = () => {
      loading = null;
      reject(new Error('Não deu para carregar o login do Google.'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export function configureGoogle(): boolean {
  return !!googleWebClientId;
}

export async function signOutOfGoogle() {
  window.google?.accounts.id.disableAutoSelect();
}
