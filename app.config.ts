import type { ConfigContext, ExpoConfig } from 'expo/config';

// The Google Sign-In plugin needs the iOS client's reversed id as a URL scheme and fails the whole
// config without it, so it is only added once the iOS OAuth client exists (see .env.example).
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    ...(iosClientId
      ? [
          [
            'react-native-nitro-google-signin',
            { iosUrlScheme: `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}` },
          ] as [string, object],
        ]
      : []),
  ],
});
