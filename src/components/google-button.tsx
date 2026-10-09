import { StyleSheet, Text } from 'react-native';
import { GOOGLE_SIGN_IN_BUTTON_HEIGHT, GoogleSignInButton } from 'react-native-nitro-google-signin';

import { configureGoogle } from '@/lib/google-sign-in';
import { colors, fonts } from '@/theme/tokens';

// Google's own branded button: Credential Manager sheet on Android, account picker on iOS.
export function GoogleButton({ onIdToken, onError }: { onIdToken: (idToken: string) => void; onError: (e: unknown) => void }) {
  if (!configureGoogle()) {
    return <Text style={styles.missing}>Login com Google ainda não configurado neste build.</Text>;
  }
  return (
    <GoogleSignInButton
      colorScheme="dark"
      size="wide"
      disabled={false}
      signInBehavior="credentialManager"
      style={{ width: '100%', height: GOOGLE_SIGN_IN_BUTTON_HEIGHT }}
      onSignInSuccess={(data) => onIdToken(data.idToken)}
      onSignInError={onError}
    />
  );
}

const styles = StyleSheet.create({
  missing: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: 'center' },
});
