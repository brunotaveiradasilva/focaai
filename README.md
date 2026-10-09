# FocaAI

App de estudos para o ENEM e vestibulares (Expo + Expo Router). A API fica no repo
[focaai-api](https://github.com/brunotaveiradasilva/focaai-api).

## Rodando

```bash
npm install
cp .env.example .env   # preencha a URL da API e os client IDs do Google
npx expo start
```

O login com Google usa código nativo (`react-native-nitro-google-signin`), então no Android e
no iOS o app roda num **development build**, não no Expo Go:

```bash
npx eas-cli@latest build --profile development --platform android
```

Na web (`npx expo start --web`) o login usa o Google Identity Services e funciona sem build.

## Login com Google

O app entra só com a conta Google. Ele recebe o ID token do Google e troca pelos tokens da API
(`POST /api/auth/google`); a sessão fica no Keychain/Keystore (`expo-secure-store`) no celular e no
`localStorage` na web, e o token de acesso é renovado sozinho quando vence (`src/lib/api.ts`).

Os client IDs vêm do Google Cloud Console (passo a passo no README da API) e entram no `.env`:

| Variável | Para quê |
|---|---|
| `EXPO_PUBLIC_API_URL` | Endereço da API (no emulador Android, o `localhost` do computador é `10.0.2.2`) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Client "Aplicativo da Web": login na web e audiência do ID token no Android |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Client iOS; também vira o URL scheme do retorno do login (`app.config.ts`) |

Sem `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, o plugin do Google não entra na config e o build de iOS
não consegue concluir o login. Para builds com Xcode 27 (iOS 27), a biblioteca pede suporte a
cenas do UIKit; ver a [doc dela](https://react-native-nitro-google-sign-in.github.io/docs/setup/expo).

## Comandos

```bash
npx expo lint      # lint
npx tsc --noEmit   # typecheck
```
