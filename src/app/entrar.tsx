import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ReactNode, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { Button, Kicker, PressableScale, Screen, Sub, Title } from '@/components/ui';
import * as account from '@/lib/api';
import { useSession } from '@/store/session';
import { colors, fonts } from '@/theme/tokens';

type Mode = 'entrar' | 'cadastro' | 'confirmar' | 'esqueci' | 'redefinir';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE = /^\d{6}$/;
const MIN_PASSWORD = 8;

// Where each step's back button goes.
const PREVIOUS: Record<Mode, Mode | null> = {
  entrar: null,
  cadastro: 'entrar',
  confirmar: 'cadastro',
  esqueci: 'entrar',
  redefinir: 'esqueci',
};

// Leaving after the login: the welcome screen underneath decides between onboarding and the app.
const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

// Entrar com e-mail e senha, criar conta (com código no e-mail) e trocar a senha esquecida.
export default function EmailSignIn() {
  const signInWith = useSession((s) => s.signInWith);
  const [mode, setMode] = useState<Mode>('entrar');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const address = email.trim().toLowerCase();
  const emailOk = EMAIL.test(address);
  const passwordOk = password.length >= MIN_PASSWORD;

  const go = (next: Mode, message: string | null = null) => {
    setMode(next);
    setError(null);
    setNotice(message);
  };

  const run = async (action: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setError(e instanceof account.ApiError ? e.message : 'Não deu para falar com o servidor. Confira sua internet.');
    } finally {
      setBusy(false);
    }
  };

  const sendSignUpCode = () => account.requestSignUp(address, name.trim(), password);
  const sendResetCode = () => account.requestPasswordReset(address);

  const steps: Record<Mode, { ready: boolean; label: string; submit: () => Promise<void> }> = {
    entrar: {
      ready: emailOk && password.length > 0,
      label: 'Entrar',
      submit: async () => {
        await signInWith(() => account.signInWithPassword(address, password));
        leave();
      },
    },
    cadastro: {
      ready: name.trim().length > 0 && emailOk && passwordOk,
      label: 'Criar conta',
      submit: async () => {
        await sendSignUpCode();
        setCode('');
        go('confirmar');
      },
    },
    confirmar: {
      ready: CODE.test(code),
      label: 'Confirmar e entrar',
      submit: async () => {
        await signInWith(() => account.confirmSignUp(address, code));
        leave();
      },
    },
    esqueci: {
      ready: emailOk,
      label: 'Mandar código',
      submit: async () => {
        await sendResetCode();
        setCode('');
        setPassword('');
        go('redefinir');
      },
    },
    redefinir: {
      ready: CODE.test(code) && passwordOk,
      label: 'Salvar senha e entrar',
      submit: async () => {
        await signInWith(() => account.resetPassword(address, code, password));
        leave();
      },
    },
  };
  const step = steps[mode];
  const submit = () => {
    if (step.ready && !busy) run(step.submit);
  };
  const resend = (send: () => Promise<void>) =>
    run(async () => {
      await send();
      setNotice('Código reenviado. Pode levar um minutinho para chegar.');
    });

  const back = () => {
    const previous = PREVIOUS[mode];
    if (previous) go(previous);
    else leave();
  };

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {busy ? (
            <ActivityIndicator color={colors.accent} style={{ height: 52 }} />
          ) : (
            <Button label={step.label} onPress={submit} disabled={!step.ready} style={{ alignSelf: 'stretch' }} />
          )}
        </View>
      }>
      <View style={styles.top}>
        <PressableScale scaleTo={0.85} onPress={back} accessibilityLabel="Voltar" style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </PressableScale>
      </View>

      {mode === 'entrar' && (
        <>
          <Kicker>Entrar com e-mail</Kicker>
          <Title>Que bom te ver</Title>
          <Sub>Entre com o e-mail e a senha da sua conta FocaAI.</Sub>
          <View style={styles.fields}>
            <EmailField value={email} onChangeText={setEmail} />
            <PasswordField value={password} onChangeText={setPassword} onSubmitEditing={submit} />
          </View>
          <View style={styles.links}>
            <Link label="Esqueci minha senha" onPress={() => go('esqueci')} />
            <Link label="Não tenho conta: criar com e-mail" onPress={() => go('cadastro')} />
          </View>
        </>
      )}

      {mode === 'cadastro' && (
        <>
          <Kicker>Criar conta</Kicker>
          <Title>Crie sua conta</Title>
          <Sub>Vamos mandar um código para o seu e-mail para confirmar que ele é seu.</Sub>
          <View style={styles.fields}>
            <Field
              label="Nome"
              value={name}
              onChangeText={setName}
              placeholder="Como podemos te chamar?"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
            />
            <EmailField value={email} onChangeText={setEmail} />
            <PasswordField
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={submit}
              isNew
              hint={`Pelo menos ${MIN_PASSWORD} caracteres.`}
            />
          </View>
          <View style={styles.links}>
            <Link label="Já tenho conta: entrar" onPress={() => go('entrar')} />
          </View>
        </>
      )}

      {mode === 'confirmar' && (
        <>
          <Kicker>Confirmar e-mail</Kicker>
          <Title>Digite o código</Title>
          <Sub>
            Mandamos 6 números para <Text style={styles.strong}>{address}</Text>. Se não aparecer, olhe também o spam.
          </Sub>
          <View style={styles.fields}>
            <CodeField value={code} onChangeText={setCode} onSubmitEditing={submit} />
          </View>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          <View style={styles.links}>
            <Link label="Reenviar código" onPress={() => resend(sendSignUpCode)} disabled={busy} />
            <Link label="Corrigir o e-mail" onPress={() => go('cadastro')} />
          </View>
        </>
      )}

      {mode === 'esqueci' && (
        <>
          <Kicker>Esqueci minha senha</Kicker>
          <Title>Vamos criar uma senha nova</Title>
          <Sub>Mandamos um código para o seu e-mail. Serve também para quem entra com Google e quer ter uma senha.</Sub>
          <View style={styles.fields}>
            <EmailField value={email} onChangeText={setEmail} onSubmitEditing={submit} />
          </View>
        </>
      )}

      {mode === 'redefinir' && (
        <>
          <Kicker>Esqueci minha senha</Kicker>
          <Title>Senha nova</Title>
          <Sub>
            Se existir uma conta com <Text style={styles.strong}>{address}</Text>, o código chega em instantes. Digite ele e
            escolha a senha nova.
          </Sub>
          <View style={styles.fields}>
            <CodeField value={code} onChangeText={setCode} />
            <PasswordField
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={submit}
              isNew
              label="Senha nova"
              hint={`Pelo menos ${MIN_PASSWORD} caracteres. Os outros aparelhos saem da conta.`}
            />
          </View>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          <View style={styles.links}>
            <Link label="Reenviar código" onPress={() => resend(sendResetCode)} disabled={busy} />
          </View>
        </>
      )}
    </Screen>
  );
}

function Field({ label, hint, right, ...input }: TextInputProps & { label: string; hint?: string; right?: ReactNode }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput placeholderTextColor={colors.muted} style={styles.input} {...input} />
        {right}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function EmailField(props: Pick<TextInputProps, 'value' | 'onChangeText' | 'onSubmitEditing'>) {
  return (
    <Field
      label="E-mail"
      placeholder="voce@exemplo.com"
      keyboardType="email-address"
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="email"
      textContentType="emailAddress"
      {...props}
    />
  );
}

function PasswordField({
  isNew,
  label = 'Senha',
  hint,
  ...props
}: Pick<TextInputProps, 'value' | 'onChangeText' | 'onSubmitEditing'> & { isNew?: boolean; label?: string; hint?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      label={label}
      hint={hint}
      secureTextEntry={!visible}
      style={[styles.input, styles.withEye]}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete={isNew ? 'new-password' : 'current-password'}
      textContentType={isNew ? 'newPassword' : 'password'}
      right={
        <Pressable
          onPress={() => setVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Esconder senha' : 'Mostrar senha'}
          hitSlop={8}
          style={styles.eye}>
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
        </Pressable>
      }
      {...props}
    />
  );
}

function CodeField(props: Pick<TextInputProps, 'value' | 'onChangeText' | 'onSubmitEditing'>) {
  return (
    <Field
      label="Código"
      placeholder="000000"
      keyboardType="number-pad"
      maxLength={6}
      autoComplete="one-time-code"
      textContentType="oneTimeCode"
      {...props}
      onChangeText={(text) => props.onChangeText?.(text.replace(/\D/g, ''))}
      style={[styles.input, styles.code]}
    />
  );
}

function Link({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" hitSlop={6}>
      <Text style={[styles.link, disabled && { opacity: 0.4 }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  fields: { gap: 16, marginTop: 8 },
  label: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  code: { fontFamily: fonts.semibold, fontSize: 22, letterSpacing: 8, textAlign: 'center' },
  withEye: { paddingRight: 44 },
  eye: { position: 'absolute', right: 12, padding: 4 },
  hint: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 6 },
  links: { gap: 14, marginTop: 22, alignItems: 'flex-start' },
  link: { color: colors.accent, fontFamily: fonts.medium, fontSize: 14 },
  strong: { color: colors.text, fontFamily: fonts.semibold },
  notice: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, marginTop: 14 },
  footer: { flex: 1, gap: 12, alignItems: 'center' },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger, textAlign: 'center' },
});
