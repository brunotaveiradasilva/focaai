import type { ConfigContext, ExpoConfig } from 'expo/config';

// Qual app está sendo gerado: o perfil do eas.json define APP_VARIANT. Staging e desenvolvimento têm
// id próprio, então instalam lado a lado com o app de produção e não mexem nos dados dele.
const variant = process.env.APP_VARIANT ?? 'production';
const variants = {
  development: { name: 'FocaAI (Dev)', id: 'com.focaai.app.dev', scheme: 'focaai-dev' },
  staging: { name: 'FocaAI (Staging)', id: 'com.focaai.app.staging', scheme: 'focaai-staging' },
  production: { name: 'FocaAI', id: 'com.focaai.app', scheme: 'focaai' },
} as const;
if (!(variant in variants)) throw new Error(`APP_VARIANT desconhecido: ${variant}`);
const { name, id, scheme } = variants[variant as keyof typeof variants];

// The Google Sign-In plugin needs the iOS client's reversed id as a URL scheme and fails the whole
// config without it, so it is only added once the iOS OAuth client exists (see .env.example).
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  name,
  scheme,
  ios: { ...config.ios, bundleIdentifier: id },
  android: { ...config.android, package: id },
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
