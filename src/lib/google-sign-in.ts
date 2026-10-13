// Google Sign-In on Android (Credential Manager) and iOS, via react-native-nitro-google-signin.
// Needs a development build: Expo Go doesn't ship this native module.
import { GoogleOneTapSignIn } from 'react-native-nitro-google-signin';

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

let configured = false;

/** False while the OAuth client IDs aren't set (see .env.example). */
export function configureGoogle(): boolean {
  if (!webClientId) return false;
  if (!configured) {
    // The ID token is issued for the web client, which is the audience the API checks.
    GoogleOneTapSignIn.configure({ webClientId, iosClientId: iosClientId ?? null });
    configured = true;
  }
  return true;
}

export async function signOutOfGoogle() {
  if (configured) await GoogleOneTapSignIn.signOut().catch(() => {});
}
