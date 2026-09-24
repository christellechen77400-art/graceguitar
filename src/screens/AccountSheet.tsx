/**
 * Le compte : se connecter, s'inscrire, changer de mot de passe.
 *
 * Une seule feuille pour tout ça, parce que ce sont les mêmes champs et qu'on
 * passe de l'un à l'autre sans quitter l'écran : se tromper de mot de passe mène
 * au lien de réinitialisation, et « pas encore de compte » mène à l'inscription.
 *
 * Rien n'est masqué : les erreurs disent ce qui s'est passé, en français, et le
 * bouton principal reste visible même quand il est inactif — un bouton qui
 * disparaît laisse croire que l'écran a changé d'avis.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import {
  ListRow,
  PrimaryButton,
  SecondaryButton,
  Sheet,
  Toggle,
  useTextStyles,
} from '../components/ui';
import { AuthErrorKey } from '../services/authErrors';
import { useAuth } from '../services/auth';
import { MIN_PASSWORD, isEmail, passwordStrength } from '../services/password';
import { useSync } from '../services/sync';
import { useSettings } from '../state/settings';
import { Theme, useStyles, useTheme } from '../theme';

/** Ce qui peut mal tourner, y compris ce que le serveur ne dit pas. */
type Problem = AuthErrorKey | 'badEmail' | 'mismatch' | 'mustAccept';

/** Ce qui vient de se passer, quand ce n'est pas une erreur. */
type Note = 'created' | 'linkSent' | 'resetDone' | 'emailSent' | 'passwordChanged';

export function AccountSheet({ onClose }: { onClose: () => void }) {
  const { t, settings, update } = useSettings();
  const auth = useAuth();
  const sync = useSync();
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();

  const [mode, setMode] = useState<'signIn' | 'signUp' | 'forgot'>('signIn');
  /** L'écran ouvert par-dessus le compte : l'adresse, ou le mot de passe. */
  const [pane, setPane] = useState<'email' | 'password' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [current, setCurrent] = useState('');
  const [confirm, setConfirm] = useState('');
  const [firstName, setFirstName] = useState(settings.firstName);
  const [accepted, setAccepted] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);

  const onProblem = (error: AuthErrorKey) => setProblem(error);
  const strength = passwordStrength(password);

  const open = (next: 'email' | 'password') => {
    setPane(next);
    setProblem(null);
    setNote(null);
  };

  /** Le prénom part avec le profil : il est aussi écrit dans les réglages. */
  const run = async (action: () => Promise<{ ok: boolean; error?: AuthErrorKey }>) => {
    setBusy(true);
    setProblem(null);
    setNote(null);
    const result = await action();
    setBusy(false);
    if (!result.ok && result.error) onProblem(result.error);
    return result.ok;
  };

  const submit = async () => {
    if (!isEmail(email)) return setProblem('badEmail');
    if (mode === 'forgot') {
      if (await run(() => auth.sendReset(email))) setNote('linkSent');
      return;
    }
    if (password.length < MIN_PASSWORD) return setProblem('weakPassword');
    if (mode === 'signUp') {
      if (password !== confirm) return setProblem('mismatch');
      if (!accepted) return setProblem('mustAccept');
      if (await run(() => auth.signUp(email, password, firstName))) {
        update({ firstName: firstName.trim() });
        setNote('created');
      }
      return;
    }
    await run(() => auth.signIn(email, password));
  };

  const submitApple = () => run(() => auth.signInWithApple());

  // ---- Le nouveau mot de passe, quand un lien a rouvert l'app ------------
  if (auth.recovery) {
    return (
      <Sheet
        visible
        title={t.space.account.resetTitle}
        onClose={onClose}
        closeLabel={t.close}
        footer={
          <PrimaryButton
            label={t.space.account.resetDone}
            disabled={busy || password.length < MIN_PASSWORD}
            onPress={() =>
              run(() => auth.setNewPassword(password)).then((ok) => {
                if (ok) {
                  setNote('resetDone');
                  setPassword('');
                }
              })
            }
          />
        }
      >
        <Text style={ui.hint}>{t.space.account.resetHint}</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={t.space.account.newPassword}
          placeholderTextColor={c.secondary}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          style={s.input}
          accessibilityLabel={t.space.account.newPassword}
        />
        <StrengthMeter strength={strength} />
        <ProblemLine problem={problem} note={note} />
      </Sheet>
    );
  }

  // ---- Le compte, une fois connecté --------------------------------------
  if (auth.account) {
    const close = { onClose, closeLabel: t.cancel };

    if (pane === 'email') {
      return (
        <Sheet
          visible
          title={t.space.account.changeEmail}
          {...close}
          footer={
            <PrimaryButton
              label={t.space.account.changeEmail}
              disabled={busy}
              onPress={() => {
                if (!isEmail(email)) return setProblem('badEmail');
                run(() => auth.changeEmail(email)).then((ok) => {
                  if (ok) {
                    setNote('emailSent');
                    setEmail('');
                  }
                });
              }}
            />
          }
        >
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={auth.account.email}
            placeholderTextColor={c.secondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            style={s.input}
            accessibilityLabel={t.space.account.changeEmail}
          />
          <Text style={ui.hint}>{t.space.account.emailSent}</Text>
        </Sheet>
      );
    }

    if (pane === 'password') {
      return (
        <Sheet
          visible
          title={t.space.account.changePassword}
          {...close}
          footer={
            <PrimaryButton
              label={t.space.account.changePassword}
              disabled={busy}
              onPress={() => {
                if (password.length < MIN_PASSWORD) return setProblem('weakPassword');
                run(() => auth.changePassword(current, password)).then((ok) => {
                  if (ok) {
                    setNote('passwordChanged');
                    setPassword('');
                    setCurrent('');
                  }
                });
              }}
            />
          }
        >
          <TextInput
            value={current}
            onChangeText={setCurrent}
            placeholder={t.space.account.currentPassword}
            placeholderTextColor={c.secondary}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            style={s.input}
            accessibilityLabel={t.space.account.currentPassword}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={t.space.account.newPassword}
            placeholderTextColor={c.secondary}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            style={s.input}
            accessibilityLabel={t.space.account.newPassword}
          />
          <StrengthMeter strength={strength} />
        </Sheet>
      );
    }

    return (
      <Sheet
        visible
        title={t.space.account.title}
        onClose={onClose}
        closeLabel={t.ok}
        footer={<PrimaryButton label={t.ok} onPress={onClose} />}
      >
        <ListRow
          title={settings.firstName || t.space.name}
          subtitle={t.space.account.signedIn(auth.account.email)}
          value={t.space.levels[settings.level]}
          last
        />
        {/* Le prénom se règle dans « Mon profil », une seule fois : on l'affiche
            ici sans le redoubler d'un second champ. */}
        <View style={s.block}>
          <ListRow title={t.space.account.changeEmail} chevron onPress={() => open('email')} />
          <ListRow title={t.space.account.changePassword} chevron last onPress={() => open('password')} />
        </View>
        <ProblemLine problem={problem} note={note} />
        <Text style={[ui.hint, s.spaced]}>
          {sync.syncing ? t.space.account.syncing : sync.error ? t.space.account.syncError : t.space.account.never}
        </Text>
        <View style={s.block}>
          <SecondaryButton
            label={t.space.account.signOut}
            onPress={() => auth.signOut().then(onClose)}
          />
        </View>
      </Sheet>
    );
  }

  // ---- Se connecter, s'inscrire, ou redemander un lien -------------------
  const title =
    mode === 'signUp'
      ? t.space.account.signUp
      : mode === 'forgot'
        ? t.space.account.forgot
        : t.space.account.signIn;

  return (
    <Sheet
      visible
      title={title}
      onClose={onClose}
      closeLabel={t.cancel}
      footer={
        <PrimaryButton
          label={mode === 'signUp' ? t.space.account.create : mode === 'forgot' ? t.space.account.sendLink : t.space.account.signIn}
          disabled={busy}
          onPress={submit}
        />
      }
    >
      <Text style={ui.hint}>{t.space.account.hint}</Text>

      {/* Apple d'abord : c'est l'option qu'on veut voir en premier sur iOS. */}
      {mode !== 'forgot' && auth.appleAvailable ? (
        <View style={s.block}>
          <SecondaryButton label={t.space.account.apple} disabled={busy} onPress={submitApple} />
          <Text style={[ui.hint, s.or]}>{t.space.account.or}</Text>
        </View>
      ) : null}

      {mode === 'signUp' ? (
        <TextInput
          value={firstName}
          onChangeText={setFirstName}
          placeholder={t.space.name}
          placeholderTextColor={c.secondary}
          autoCapitalize="words"
          autoComplete="given-name"
          textContentType="givenName"
          style={s.input}
          accessibilityLabel={t.space.name}
        />
      ) : null}

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder={t.space.account.email}
        placeholderTextColor={c.secondary}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        style={s.input}
        accessibilityLabel={t.space.account.email}
      />

      {mode !== 'forgot' ? (
        <>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={t.space.account.password}
            placeholderTextColor={c.secondary}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
            textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
            style={s.input}
            accessibilityLabel={t.space.account.password}
          />
          {mode === 'signUp' ? <StrengthMeter strength={strength} /> : null}
        </>
      ) : null}

      {mode === 'signUp' ? (
        <>
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            placeholder={t.space.account.confirm}
            placeholderTextColor={c.secondary}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            style={s.input}
            accessibilityLabel={t.space.account.confirm}
          />
          <Toggle label={t.space.account.accept} value={accepted} onChange={setAccepted} />
        </>
      ) : null}

      <ProblemLine problem={problem} note={note} />

      <View style={s.block}>
        {mode === 'signIn' ? (
          <ListRow
            title={t.space.account.forgot}
            chevron
            last
            onPress={() => {
              setMode('forgot');
              setProblem(null);
            }}
          />
        ) : null}
        <ListRow
          title={mode === 'signUp' ? t.space.account.haveAccount : t.space.account.signUp}
          chevron
          last
          onPress={() => {
            setMode(mode === 'signUp' ? 'signIn' : 'signUp');
            setProblem(null);
          }}
        />
      </View>
    </Sheet>
  );
}

/** L'avis sur le mot de passe : trois barres, et le mot qui va avec. */
function StrengthMeter({ strength }: { strength: ReturnType<typeof passwordStrength> }) {
  const { t } = useSettings();
  const s = useStyles(makeStyles);
  const { c } = useTheme();
  const filled = { weak: 1, medium: 2, strong: 3 }[strength];

  return (
    <View style={s.meter}>
      <View style={s.bars}>
        {[1, 2, 3].map((rank) => (
          <View
            key={rank}
            style={[s.bar, { backgroundColor: rank <= filled ? (rank === 1 ? c.destructive : c.accent) : c.separator }]}
          />
        ))}
      </View>
      <Text style={s.meterLabel}>{t.space.account.strength[strength]}</Text>
    </View>
  );
}

/** Ce qui vient de se passer : une erreur, ou une bonne nouvelle. */
function ProblemLine({ problem, note }: { problem: Problem | null; note: Note | null }) {
  const { t } = useSettings();
  const s = useStyles(makeStyles);
  const account = t.space.account;

  const text = problem
    ? { badEmail: account.badEmail, mismatch: account.mismatch, mustAccept: account.mustAccept, ...account.errors }[
        problem
      ]
    : note
      ? {
          created: account.created,
          linkSent: account.linkSent,
          resetDone: account.resetDone,
          emailSent: account.emailSent,
          passwordChanged: account.passwordChanged,
        }[note]
      : null;

  if (!text) return null;
  return (
    <Text
      style={[s.problem, problem ? s.problemBad : null]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      {text}
    </Text>
  );
}

const makeStyles = ({ c, type, space, radius, size }: Theme) =>
  StyleSheet.create({
    input: {
      ...type.body,
      color: c.label,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.separator,
      borderRadius: radius.chip,
      paddingHorizontal: space.md,
      marginHorizontal: space.lg,
      marginTop: space.md,
      minHeight: size.touch,
    },
    spaced: { marginTop: space.md },
    block: { marginTop: space.md },
    or: { textAlign: 'center', marginTop: space.sm },
    problem: { ...type.caption, color: c.secondary, paddingHorizontal: space.lg, marginTop: space.md, lineHeight: 18 },
    problemBad: { color: c.destructive },
    meter: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, marginTop: space.sm },
    bars: { flexDirection: 'row', gap: space.xs, flex: 1 },
    bar: { height: 4, borderRadius: 2, flex: 1 },
    meterLabel: { ...type.caption, color: c.secondary },
  });
