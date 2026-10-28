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

Fotos de perfil e dos posts usam `expo-image-picker` e `expo-image-manipulator`, que também têm
código nativo: depois de atualizar, gere um development build novo.

## Ambientes (dev, staging e produção)

Cada ambiente é um app separado, com API e banco próprios, para testar mudança sem encostar em
quem usa o app de verdade:

| Perfil do EAS | App (`APP_VARIANT`) | Id Android/iOS | Variáveis do EAS | API |
|---|---|---|---|---|
| `development` | FocaAI (Dev) | `com.focaai.app.dev` | `development` | local (`.env`) |
| `staging` | FocaAI (Staging) | `com.focaai.app.staging` | `preview` | API de staging no Railway |
| `production` | FocaAI | `com.focaai.app` | `production` | API de produção no Railway |

Como os ids são diferentes, os três ficam instalados lado a lado no mesmo celular. O nome, o id e o
scheme de cada um estão no `app.config.ts`; o perfil do `eas.json` escolhe a variante e de qual
ambiente do EAS vêm as variáveis.

As variáveis `EXPO_PUBLIC_` de cada ambiente ficam no EAS (expo.dev → projeto → Environment
variables, ou pela CLI):

```bash
npx eas-cli@latest env:set --name EXPO_PUBLIC_API_URL --value https://focaai-api-staging.up.railway.app --environment preview --visibility plaintext
```

Cadastre `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` e
`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` em `preview` (staging) e em `production`, cada um com os
valores do seu ambiente.

Fluxo de uma mudança: abre o PR → gera `--profile staging` e testa no app de staging, contra a API
de staging → mergeia → gera `--profile production`.

```bash
npx eas-cli@latest build --profile staging --platform android
```

**API de staging (Railway):** no projeto do Railway, crie um ambiente `staging` (seletor de
ambiente no topo → **New Environment**, duplicando `production`). Ele ganha cópias da API e do
PostgreSQL, com banco vazio e domínio próprio. Nas variáveis do ambiente `staging`, troque o
`JWT_SECRET` por outro valor e, se quiser que staging acompanhe uma branch (ex.: `develop`), mude
a branch em **Settings → Source** do serviço da API nesse ambiente.

**Google:** os clients OAuth de Android e iOS são presos ao id do app, então o app de staging
precisa dos seus: no Google Cloud Console, crie um client Android para `com.focaai.app.staging`
(com o SHA-1 da keystore de staging, que o EAS mostra em `npx eas-cli@latest credentials`) e um
client iOS para o mesmo bundle id. Coloque esses client IDs no `GOOGLE_CLIENT_IDS` da API de
staging, e o client iOS de staging no `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` do ambiente `preview` do
EAS. O client web pode ser o mesmo nos dois.

## Dados

O app não calcula nem guarda o estudo sozinho: perfil, plano da semana, roadmap, check-ins,
simulados, estatísticas e pessoas vêm da API (`src/lib/queries.ts`, com TanStack Query). O
conteúdo fixo (matérias, cursos, datas de prova) é baixado na abertura e guardado no aparelho
(`src/data/catalog.ts`): sem internet o app abre, mas as telas de estudo precisam da API.

Quem já usava o app antes da API tinha tudo só no aparelho: no primeiro login de uma conta sem
perfil, esses dados vão para a conta (`POST /api/eu/importar`) e saem do aparelho
(`src/lib/legacy.ts`).

### Rodando com a API local

No repo da API, `./mvnw spring-boot:test-run` sobe a API sem Docker. No `.env` do app, use
`EXPO_PUBLIC_API_URL=http://localhost:8080` e `EXPO_PUBLIC_DEV_LOGIN=1`: a tela de entrada ganha
**Entrar como aluno de teste**, para usar o app antes de configurar o Google.

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
