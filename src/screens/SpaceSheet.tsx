/**
 * Mon espace, en mode local.
 *
 * C'est le seul endroit où l'on règle l'app : la langue, la notation et le son ont
 * quitté l'en-tête des écrans, parce qu'un réglage qu'on change une fois n'a rien à
 * faire dans une barre de titre. Ce qui se règle en jouant — la tonalité, la gamme,
 * l'affichage du manche — reste là où on joue.
 *
 * Le compte viendra plus tard : tant qu'il n'y a pas de serveur, l'app fonctionne
 * seule et cette feuille ne promet rien d'autre que ce qu'elle fait.
 */
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { Linking, Platform, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import {
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
import { APP_VERSION, PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL } from '../config';
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

/** Le volume se règle en trois crans : assez pour s'entendre, pas pour gêner. */
const VOLUMES = [
  { value: 'low', level: 0.35 },
  { value: 'medium', level: 0.7 },
  { value: 'high', level: 1 },
] as const;

type VolumeId = (typeof VOLUMES)[number]['value'];

const GOALS = [5, 10, 15];

/** Les trois écrans qui répondent « pas encore ». */
type Soon = 'church' | 'tuner' | 'plus';

export function SpaceSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { settings, notation, t, update } = useSettings();
  const { songs, sets } = useSongs();
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const retest = useRetest();

  const [resetting, setResetting] = useState(false);
  /** L'écran « bientôt disponible », nommé par ce qu'on a touché. */
  const [soon, setSoon] = useState<Soon | null>(null);
  const [exported, setExported] = useState<'shared' | 'copied' | null>(null);

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
      <ListRow
        title={t.space.church}
        subtitle={t.space.churchHint}
        value={t.space.churchNone}
        chevron
        onPress={() => setSoon('church')}
      />
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

      <SectionHeader>{t.space.subscription}</SectionHeader>
      <ListRow
        title={t.space.plus}
        subtitle={t.space.soonAvailable}
        value={t.space.free}
        chevron
        onPress={() => setSoon('plus')}
      />
      <ListRow title={t.space.restore} subtitle={t.space.soonAvailable} muted last />

      <SectionHeader>{t.space.tools}</SectionHeader>
      <ListRow title={t.tuner} subtitle={t.space.tunerHint} chevron last onPress={() => setSoon('tuner')} />

      <SectionHeader>{t.space.data}</SectionHeader>
      <SecondaryButton label={t.space.export} onPress={onExport} />
      <Text style={ui.hint}>{exported ? t.space[exported === 'copied' ? 'exportCopied' : 'exportShared'] : t.space.exportHint}</Text>
      <View style={s.block}>
        <ListRow title={t.space.reset} subtitle={t.space.resetHint} chevron last onPress={() => setResetting(true)} />
      </View>

      <SectionHeader>{t.space.help}</SectionHeader>
      <ListRow title={t.space.support} chevron onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {})} />
      <ListRow title={t.space.privacy} chevron onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})} />
      <ListRow title={t.space.terms} chevron onPress={() => Linking.openURL(TERMS_URL).catch(() => {})} />
      <ListRow title={t.space.version} value={APP_VERSION} last />

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

  const title = { church: t.space.church, tuner: t.tuner, plus: t.space.plus }[which];
  const hint = { church: t.space.churchHint, tuner: t.space.tunerHint, plus: t.space.plusHint }[which];

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
    footerRow: { flexDirection: 'row', gap: space.md },
    grow: { flex: 1 },
  });
