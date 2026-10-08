/**
 * Mon espace.
 *
 * C'est le seul endroit où l'on règle l'app : la langue, la notation et le son ont
 * quitté l'en-tête des écrans, parce qu'un réglage qu'on change une fois n'a rien à
 * faire dans une barre de titre. Ce qui se règle en jouant — la tonalité, la gamme,
 * l'affichage du manche — reste là où on joue.
 *
 * Le compte n'apparaît que s'il y a un serveur : sans projet Supabase configuré,
 * la section disparaît entièrement et l'app reste un carnet sur le téléphone.
 */
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { Linking, Platform, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  Card,
  Chip,
  ChipRow,
  ListRow,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  Segmented,
  Sheet,
  Stepper,
  Toggle,
  useTextStyles,
} from '../components/ui';
import { APP_VERSION, FEATURE_CHURCH_SYNC } from '../config';
import { initialsOf } from '../services/account';
import { useAuth } from '../services/auth';
import {
  clampReminderHour,
  REMINDER_HOUR_MAX,
  REMINDER_HOUR_MIN,
} from '../home/reminder';
import { syncDailyReminder } from '../home/notifications';
import { useRetest } from '../navigation';
import { useSettings } from '../state/settings';
import { exportJson, exportName } from '../state/export';
import { useSongs } from '../songs/store';
import { Appearance, Theme, useStyles, useTheme } from '../theme';
import { noteName, prefersFlats } from '../theory/notes';
import { CAPO_SHAPES } from '../theory/worship';
import { AccountSheet } from './AccountSheet';

/** Le volume se règle en trois crans : assez pour s'entendre, pas pour gêner. */
const VOLUMES = [
  { value: 'low', level: 0.35 },
  { value: 'medium', level: 0.7 },
  { value: 'high', level: 1 },
] as const;

type VolumeId = (typeof VOLUMES)[number]['value'];

const GOALS = [5, 10, 15];

/** Les trois écrans qui répondent « pas encore ». */
type Soon = 'church' | 'tuner';

export function SpaceSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { settings, notation, t, update } = useSettings();
  const { songs, sets } = useSongs();
  const auth = useAuth();
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const retest = useRetest();

  const [resetting, setResetting] = useState(false);
  /** L'écran « bientôt disponible », nommé par ce qu'on a touché. */
  const [soon, setSoon] = useState<Soon | null>(null);
  const [exported, setExported] = useState<'shared' | 'copied' | null>(null);
  const [account, setAccount] = useState(false);
  /** La suppression du compte se demande deux fois : `ask`, puis `confirm`. */
  const [deleting, setDeleting] = useState<'ask' | 'confirm' | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);

  const volume = VOLUMES.reduce(
    (best, v) => (Math.abs(v.level - settings.volume) < Math.abs(best.level - settings.volume) ? v : best),
    VOLUMES[1],
  );

  /**
   * L'export part par la feuille de partage sur un téléphone, et par le
   * presse-papiers sur le web, où il n'y en a pas. Les deux disent ce qui s'est
   * passé : un bouton qui ne répond pas laisse croire qu'il est cassé.
   */
  const onExport = async () => {
    const now = new Date();
    const json = exportJson(
      {
        firstName: settings.firstName,
        level: settings.level,
        goalMinutes: settings.goalMinutes,
        hand: settings.hand,
        practice: settings.practice,
        progress: settings.progress,
        practiceDays: settings.practiceDays,
        runs: settings.runs,
        songs,
        sets,
      },
      now,
    );
    try {
      if (Platform.OS === 'web') {
        await Clipboard.setStringAsync(json);
        setExported('copied');
      } else {
        await Share.share({ title: exportName(now), message: json });
        setExported('shared');
      }
    } catch {
      // Une feuille de partage qu'on referme n'est pas une erreur.
    }
  };

  // Ce qui repart de zéro : la progression seule. Les chants et les sets sont du
  // travail de saisie, pas de la pratique, et on ne les efface pas par surprise.
  const reset = () => {
    update({ progress: {}, practiceDays: [], runs: [] });
    setResetting(false);
  };

  const toggleShape = (pc: number) =>
    update({
      preferredShapes: settings.preferredShapes.includes(pc)
        ? settings.preferredShapes.filter((p) => p !== pc)
        : [...settings.preferredShapes, pc].sort((a, b) => a - b),
    });

  if (soon) return <SoonSheet which={soon} onClose={() => setSoon(null)} />;
  if (account) return <AccountSheet onClose={() => setAccount(false)} />;

  // La suppression d'un compte ne se demande pas une fois : la première feuille
  // dit ce qui va partir, la seconde le redit et attend le geste.
  if (deleting) {
    const last = deleting === 'confirm';
    return (
      <Sheet
        visible={visible}
        title={last ? t.space.account.deleteConfirm : t.space.account.delete}
        onClose={() => {
          setDeleting(null);
          setDeleteFailed(false);
        }}
        closeLabel={t.cancel}
        footer={
          <View style={s.footerRow}>
            <SecondaryButton
              label={t.cancel}
              style={s.grow}
              onPress={() => {
                setDeleting(null);
                setDeleteFailed(false);
              }}
            />
            <SecondaryButton
              destructive
              label={last ? t.space.account.deleteYes : t.space.account.delete}
              style={s.grow}
              onPress={() => {
                if (!last) return setDeleting('confirm');
                auth
                  .deleteAccount()
                  .then((result) => {
                    if (result.ok) {
                      setDeleting(null);
                      onClose();
                    } else {
                      setDeleteFailed(true);
                    }
                  })
                  .catch(() => setDeleteFailed(true));
              }}
            />
          </View>
        }
      >
        <Text style={s.confirm}>
          {last ? t.space.account.deleteConfirmHint : t.space.account.deleteHint}
        </Text>
        {deleteFailed ? <Text style={[s.confirm, s.failed]}>{t.space.account.deleteFailed}</Text> : null}
      </Sheet>
    );
  }

  if (resetting) {
    return (
      <Sheet
        visible={visible}
        title={t.space.resetConfirm}
        onClose={() => setResetting(false)}
        closeLabel={t.cancel}
        footer={
          <View style={s.footerRow}>
            <SecondaryButton label={t.cancel} style={s.grow} onPress={() => setResetting(false)} />
            <SecondaryButton destructive label={t.space.resetYes} style={s.grow} onPress={reset} />
          </View>
        }
      >
        <Text style={s.confirm}>{t.space.resetConfirmHint}</Text>
      </Sheet>
    );
  }

  return (
    <Sheet
      visible={visible}
      title={t.space.title}
      onClose={onClose}
      closeLabel={t.ok}
      footer={<PrimaryButton label={t.ok} onPress={onClose} />}
    >
      <SectionHeader>{t.space.profile}</SectionHeader>
      <TextInput
        value={settings.firstName}
        onChangeText={(firstName) => update({ firstName })}
        placeholder={t.space.name}
        placeholderTextColor={c.secondary}
        autoCapitalize="words"
        autoCorrect={false}
        style={s.input}
        accessibilityLabel={t.space.name}
      />
      <Text style={ui.hint}>{t.space.nameHint}</Text>

      {/* Sans serveur configuré, l'en-tête entier disparaît : rien ne doit
          annoncer un compte qui ne pourrait pas exister. */}
      {auth.available ? (
        auth.account ? (
          <View style={s.accountHead}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initialsOf(settings.firstName, auth.account.email)}</Text>
            </View>
            <View style={s.accountText}>
              <Text style={s.accountName} numberOfLines={1}>
                {settings.firstName || t.space.name}
              </Text>
              <Text style={s.accountMail} numberOfLines={1}>
                {auth.account.email}
              </Text>
            </View>
          </View>
        ) : (
          <Card>
            <Text style={s.invite}>{t.space.account.invite}</Text>
            <View style={s.cardRow}>
              <PrimaryButton label={t.space.account.signUp} style={s.grow} onPress={() => setAccount(true)} />
              <SecondaryButton label={t.space.account.signIn} style={s.grow} onPress={() => setAccount(true)} />
            </View>
          </Card>
        )
      ) : null}

      <SectionHeader>{t.space.game}</SectionHeader>
      <ListRow
        title={t.space.level}
        subtitle={t.space.levelTestHint}
        value={t.space.levels[settings.level]}
        chevron
        onPress={retest}
      />
      <Text style={ui.hint}>{t.space.goal}</Text>
      <ChipRow>
        {GOALS.map((minutes) => (
          <Chip
            key={minutes}
            label={t.space.goalMinutes(minutes)}
            selected={settings.goalMinutes === minutes}
            onPress={() => update({ goalMinutes: minutes })}
          />
        ))}
      </ChipRow>
      <Text style={ui.hint}>{t.space.goalHint}</Text>

      <Toggle
        label={t.space.dailyReminder}
        value={settings.dailyReminder}
        onChange={(dailyReminder) => {
          update({ dailyReminder });
          syncDailyReminder(
            dailyReminder,
            settings.reminderHour,
            t.space.reminderTitle,
            t.space.reminderBody,
          ).catch(() => {});
        }}
      />
      <Text style={ui.hint}>{t.space.dailyReminderHint}</Text>
      <Stepper
        label={t.space.reminderHour}
        value={settings.reminderHour}
        min={REMINDER_HOUR_MIN}
        max={REMINDER_HOUR_MAX}
        format={(h) => t.hour(h)}
        onChange={(reminderHour) => {
          const hour = clampReminderHour(reminderHour);
          update({ reminderHour: hour });
          syncDailyReminder(
            settings.dailyReminder,
            hour,
            t.space.reminderTitle,
            t.space.reminderBody,
          ).catch(() => {});
        }}
      />

      {/* Le manche gaucher n'est pas dessiné : la ligne le dit, plutôt que de
          laisser un choix qui ne changerait rien. */}
      <ListRow title={t.space.hand} subtitle={t.space.handSoon} value={t.space.hands.right} muted last />
      <ListRow title={t.space.tuning} subtitle={t.space.tuningHint} value={t.space.tuningStandard} last />

      <Text style={[ui.hint, s.spaced]}>{t.space.shapes}</Text>
      <ChipRow>
        {CAPO_SHAPES.map((pc) => (
          <Chip
            key={pc}
            label={noteName(pc, notation, prefersFlats(pc))}
            selected={settings.preferredShapes.includes(pc)}
            onPress={() => toggleShape(pc)}
          />
        ))}
      </ChipRow>
      <Text style={ui.hint}>{t.space.shapesHint}</Text>

      <SectionHeader>{t.space.worship}</SectionHeader>
      {FEATURE_CHURCH_SYNC ? (
        <ListRow
          title={t.space.church}
          subtitle={t.space.churchHint}
          value={t.space.churchNone}
          chevron
          onPress={() => setSoon('church')}
        />
      ) : null}
      <Toggle
        label={t.space.thursdayReminder}
        value={settings.reminders}
        onChange={(reminders) => update({ reminders })}
      />
      <Text style={ui.hint}>{t.space.thursdayHint}</Text>

      <SectionHeader>{t.space.display}</SectionHeader>
      <Text style={ui.hint}>{t.language}</Text>
      <Segmented<'fr' | 'en'>
        value={settings.lang}
        onChange={(lang) => update({ lang })}
        options={[
          { value: 'fr', label: 'Français' },
          { value: 'en', label: 'English' },
        ]}
      />
      <Text style={[ui.hint, s.spaced]}>{t.notation}</Text>
      <Segmented<'anglo' | 'latin'>
        value={settings.notation}
        onChange={(notation) => update({ notation })}
        options={[
          { value: 'anglo', label: 'C D E' },
          { value: 'latin', label: 'Do Ré Mi' },
        ]}
      />
      <Text style={ui.hint}>{t.space.notationHint}</Text>

      <Text style={[ui.hint, s.spaced]}>{t.space.appearance}</Text>
      <Segmented<Appearance>
        value={settings.appearance}
        onChange={(appearance) => update({ appearance })}
        options={[
          { value: 'auto', label: t.space.appearanceMode.auto },
          { value: 'light', label: t.space.appearanceMode.light },
          { value: 'dark', label: t.space.appearanceMode.dark },
        ]}
      />

      <Toggle label={t.space.sound} value={settings.sound} onChange={(sound) => update({ sound })} />
      <Text style={ui.hint}>{t.space.soundHint}</Text>
      <Text style={[ui.hint, s.spaced]}>{t.space.volume}</Text>
      <Segmented<VolumeId>
        value={volume.value}
        onChange={(id) => {
          const chosen = VOLUMES.find((v) => v.value === id);
          if (chosen) update({ volume: chosen.level });
        }}
        options={[
          { value: 'low', label: t.space.volumes.low },
          { value: 'medium', label: t.space.volumes.medium },
          { value: 'high', label: t.space.volumes.high },
        ]}
      />

      <SectionHeader>{t.space.tools}</SectionHeader>
      <ListRow title={t.tuner} subtitle={t.space.tunerHint} chevron last onPress={() => setSoon('tuner')} />

      <SectionHeader>{t.space.data}</SectionHeader>
      <SecondaryButton label={t.space.export} onPress={onExport} />
      <Text style={ui.hint}>{exported ? t.space[exported === 'copied' ? 'exportCopied' : 'exportShared'] : t.space.exportHint}</Text>
      <View style={s.block}>
        <ListRow title={t.space.reset} subtitle={t.space.resetHint} chevron last onPress={() => setResetting(true)} />
      </View>

      <SectionHeader>{t.space.help}</SectionHeader>
      <ListRow title={t.space.version} value={APP_VERSION} last={!auth.account} />

      {/* En tout dernier, et seulement quand il y a un compte : c'est la seule
          ligne de la feuille qu'on ne peut pas défaire. */}
      {auth.account ? (
        <View style={s.block}>
          <ListRow
            destructive
            title={t.space.account.delete}
            subtitle={t.space.account.deleteHint}
            chevron
            last
            onPress={() => setDeleting('ask')}
          />
        </View>
      ) : null}

    </Sheet>
  );
}

/**
 * « Bientôt disponible ».
 *
 * Une seule feuille pour les deux choses qui n'y sont pas encore — l'église et
 * l'accordeur — parce que c'est la même réponse. Les lignes sont grises avec leur
 * sous-titre, jamais une pastille colorée : rien n'est cassé, ce n'est pas prêt.
 */
function SoonSheet({ which, onClose }: { which: Soon; onClose: () => void }) {
  const { t } = useSettings();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();

  const title = { church: t.space.church, tuner: t.tuner }[which];
  const hint = { church: t.space.churchHint, tuner: t.space.tunerHint }[which];

  return (
    <Sheet
      visible
      title={title}
      onClose={onClose}
      closeLabel={t.ok}
      footer={<PrimaryButton label={t.ok} onPress={onClose} />}
    >
      {/* Une église se relie à un service : les deux sont annoncés, grisés. */}
      {which === 'church' ? (
        <View style={s.block}>
          <ListRow title={t.space.gcc} subtitle={t.space.soonAvailable} muted last />
          <ListRow title={t.space.planningCenter} subtitle={t.space.soonAvailable} muted last />
        </View>
      ) : null}
      <Text style={[ui.hint, s.block]}>{hint}</Text>
    </Sheet>
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
      minHeight: size.touch,
    },
    spaced: { marginTop: space.md },
    /** Une ligne de liste qui suit un bouton : elle a besoin d'air au-dessus. */
    block: { marginTop: space.md },
    confirm: { ...type.body, color: c.label, paddingHorizontal: space.lg, marginTop: space.lg },
    failed: { color: c.destructive, marginTop: space.sm },
    footerRow: { flexDirection: 'row', gap: space.md },
    accountHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      paddingHorizontal: space.lg,
      marginTop: space.lg,
    },
    avatar: {
      width: size.touch,
      height: size.touch,
      borderRadius: size.touch / 2,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { ...type.body, color: c.onAccent },
    accountText: { flex: 1 },
    accountName: { ...type.cardTitle, color: c.label },
    accountMail: { ...type.caption, color: c.secondary },
    invite: { ...type.body, color: c.label, paddingHorizontal: space.lg, marginTop: space.lg },
    /** Le rang de boutons de la carte d'invitation : elle porte ses marges. */
    cardRow: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, marginTop: space.md },
    grow: { flex: 1 },
  });
