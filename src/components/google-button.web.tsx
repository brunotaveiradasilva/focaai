import { useEffect, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';

import { googleWebClientId, loadGoogleIdentity } from '@/lib/google-sign-in.web';
import { colors, fonts } from '@/theme/tokens';

// Google renders its own button into this div (Google Identity Services).
export function GoogleButton({ onIdToken, onError }: { onIdToken: (idToken: string) => void; onError: (e: unknown) => void }) {
  const host = useRef<HTMLDivElement>(null);
  // The callback is registered once with Google; the ref keeps it pointing at the latest props.
  const handlers = useRef({ onIdToken, onError });
  useEffect(() => {
    handlers.current = { onIdToken, onError };
  });

  useEffect(() => {
    const clientId = googleWebClientId;
    if (!clientId) return;
    let cancelled = false;
    loadGoogleIdentity()
      .then((google) => {
        if (cancelled || !host.current) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => handlers.current.onIdToken(response.credential),
          ux_mode: 'popup',
        });
        google.accounts.id.renderButton(host.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          locale: 'pt-BR',
          width: Math.min(400, host.current.clientWidth || 320),
        });
      })
      .catch((e) => handlers.current.onError(e));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!googleWebClientId) {
    return <Text style={styles.missing}>Login com Google ainda não configurado (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).</Text>;
  }
  return <div ref={host} style={{ width: '100%', minHeight: 44, display: 'flex', justifyContent: 'center' }} />;
}

const styles = StyleSheet.create({
  missing: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: 'center' },
});
