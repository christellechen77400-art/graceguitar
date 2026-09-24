import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SessionCard } from '../components/SessionCard';
import { StreakPill } from '../components/StreakPill';
import { TunerIcon } from '../components/icons';
import {
  Chip,
  ChipRow,
  ListRow,
  PrimaryButton,
  Screen,
  SectionHeader,
  Sheet,
  Stepper,
  Toggle,
  useTextStyles,
} from '../components/ui';
import { seedOf } from '../home/day';
import { isSundayMode, SUNDAY_QUESTIONS } from '../home/order';
import { dailySession } from '../practice/daily';
import {
  ExerciseId,
  EXERCISES,
  makeRun,
  PracticeSettings,
  QUESTION_COUNTS,
  Question,
  streak,
  ZONES,
} from '../practice/engine';
import { today as todayIso } from '../songs/model';
import { useSettings } from '../state/settings';
import { Theme, useStyles, useTheme } from '../theme';
import { noteName, STANDARD_TUNING, STRING_COUNT } from '../theory/notes';
import { LessonsPanel } from './LessonsPanel';
import { RunScreen } from './Run';

/** Le compteur de questions ne sort pas de la plage que le moteur sait poser. */
const MIN_QUESTIONS = QUESTION_COUNTS[0];
const MAX_QUESTIONS = QUESTION_COUNTS[QUESTION_COUNTS.length - 1];

/**
 * L'onglet Exercices.
 *
 * Il ouvre sur la même séance que l'accueil — c'est le même objet, pas une carte
 * qui y ressemble — puis range les exercices par terrain. Toucher un exercice
 * n'ouvre pas une séance : ça ouvre ses réglages. On choisit ses cordes, sa zone,
 * sa longueur, et on part.
 */
export function PracticeScreen() {
  const s = useStyles(makeStyles);
  const { settings, t } = useSettings();
  const { c } = useTheme();
  const iso = todayIso();
  const [run, setRun] = useState<Question[] | null>(null);
  const [editing, setEditing] = useState<ExerciseId | null>(null);
  const [tuner, setTuner] = useState(false);

  const sunday = isSundayMode(new Date(`${iso}T00:00:00.000Z`).getUTCDay());
  const session = useMemo(
    () =>
      dailySession(settings.practice, settings.progress, seedOf(iso), sunday ? SUNDAY_QUESTIONS : undefined),
    [settings.practice, settings.progress, iso, sunday],
  );
  const doneToday = useMemo(
    () =>
      new Set<ExerciseId>(
        settings.runs.filter((record) => record.day === iso).flatMap((record) => record.exercises),
      ),
    [settings.runs, iso],
  );

  if (run) return <RunScreen questions={run} onExit={() => setRun(null)} />;

  const start = (id: ExerciseId) => {
    setEditing(null);
    setRun(makeRun(id, settings.practice, seedOf(`${iso}-${id}`)));
  };

  const sections = (['neck', 'chordsEar'] as const).map((key) => ({
    key,
    ids: EXERCISES.filter((e) => e.section === key).map((e) => e.id),
  }));

  return (
    <Screen tab="practice" title={t.practice.title} titleRight={<StreakPill days={streak(settings.practiceDays, iso)} />}>
      <View style={s.card}>
        <SessionCard
          session={session}
          done={doneToday}
          sunday={sunday}
          onStart={(questions) => questions.length && setRun(questions)}
        />
      </View>

      {sections.map((section) => (
        <React.Fragment key={section.key}>
          <SectionHeader>{t.practice.sections[section.key]}</SectionHeader>
          {section.ids.map((id, i) => (
            <ListRow
              key={id}
              title={t.practice.exercises[id]}
              subtitle={t.practice.hints[id]}
              chevron
              last={i === section.ids.length - 1}
              onPress={() => setEditing(id)}
            />
          ))}
        </React.Fragment>
      ))}

      <SectionHeader>{t.practice.sections.theory}</SectionHeader>
      <LessonsPanel />

      <SectionHeader>{t.practice.sections.tools}</SectionHeader>
      <ListRow
        icon={<TunerIcon color={c.iconForeground} size={18} />}
        title={t.tuner}
        chevron
        last
        onPress={() => setTuner(true)}
      />

      {editing ? (
        <ExerciseSheet
          id={editing}
          onClose={() => setEditing(null)}
          onStart={() => start(editing)}
        />
      ) : null}

      <Sheet visible={tuner} title={t.tuner} onClose={() => setTuner(false)} closeLabel={t.close}>
        <Text style={s.soon}>{t.practice.comingSoon}</Text>
        <Text style={s.soonHint}>{t.practice.tunerHint}</Text>
      </Sheet>
    </Screen>
  );
}

/**
 * Les réglages d'un exercice, dans une feuille.
 *
 * Les mêmes réglages servent à tous les exercices : ils sont enregistrés une
 * fois, et l'exercice qu'on ouvre n'est que celui qu'on va lancer.
 */
function ExerciseSheet({ id, onClose, onStart }: { id: ExerciseId; onClose: () => void; onStart: () => void }) {
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const { settings, t, update } = useSettings();
  const p = settings.practice;
  const set = (patch: Partial<PracticeSettings>) => update({ practice: { ...p, ...patch } });

  const toggleString = (string: number) => {
    const next = p.strings.includes(string)
      ? p.strings.filter((x) => x !== string)
      : [...p.strings, string].sort();
    // Ne jamais laisser une séance sans rien à demander.
    if (next.length) set({ strings: next });
  };

  return (
    <Sheet
      visible
      title={t.practice.exercises[id]}
      onClose={onClose}
      closeLabel={t.close}
      footer={<PrimaryButton label={t.practice.start} onPress={onStart} />}
    >
      <SectionHeader>{t.practice.strings}</SectionHeader>
      <Text style={ui.hint}>{t.practice.stringsHint}</Text>
      <ChipRow>
        <Chip label={t.practice.oneString} selected={p.strings.length === 1} onPress={() => set({ strings: [5] })} />
        <Chip label={t.practice.twoStrings} selected={p.strings.length === 2} onPress={() => set({ strings: [4, 5] })} />
        <Chip
          label={t.practice.allStrings}
          selected={p.strings.length === STRING_COUNT}
          onPress={() => set({ strings: [0, 1, 2, 3, 4, 5] })}
        />
      </ChipRow>
      <ChipRow>
        {Array.from({ length: STRING_COUNT }, (_, i) => STRING_COUNT - 1 - i).map((string) => (
          <Chip
            key={string}
            label={noteName(STANDARD_TUNING[string], 'anglo', false)}
            selected={p.strings.includes(string)}
            onPress={() => toggleString(string)}
          />
        ))}
      </ChipRow>

      <SectionHeader>{t.practice.zone}</SectionHeader>
      <ChipRow>
        {ZONES.map((z) => (
          <Chip
            key={`${z.from}-${z.to}`}
            label={t.practice.zoneLabel(z.from, z.to)}
            selected={p.zoneFrom === z.from && p.zoneTo === z.to}
            onPress={() => set({ zoneFrom: z.from, zoneTo: z.to })}
          />
        ))}
      </ChipRow>

      {/* Répondre en jouant demande un micro qui écoute : la ligne est là, et
          annoncée comme telle plutôt que de faire semblant. */}
      <SectionHeader>{t.practice.answering}</SectionHeader>
      <ListRow title={t.practice.onScreen} right={<Text style={s.check}>✓</Text>} />
      <ListRow title={t.practice.byGuitar} subtitle={t.practice.comingSoon} muted last />

      <SectionHeader>{t.practice.questions}</SectionHeader>
      <Stepper
        label={t.practice.questions}
        value={p.questionCount}
        onChange={(questionCount) => set({ questionCount })}
        min={MIN_QUESTIONS}
        max={MAX_QUESTIONS}
        step={MIN_QUESTIONS}
      />

      <SectionHeader>{t.practice.settings}</SectionHeader>
      <Toggle label={t.practice.accidentals} value={p.accidentals} onChange={(accidentals) => set({ accidentals })} />
      <Toggle label={t.practice.timed} value={p.timed} onChange={(timed) => set({ timed })} />
    </Sheet>
  );
}

/** Les trois lignes qui restent : rien à étiqueter, seulement à espacer. */
const makeStyles = ({ c, type, space }: Theme) =>
  StyleSheet.create({
    /** La carte de séance porte déjà ses 16 de marge : on n'ajoute qu'un peu d'air. */
    card: { marginTop: space.md },
    check: { ...type.body, color: c.accent },
    soon: { ...type.section, color: c.label, paddingHorizontal: space.lg, marginTop: space.xl },
    soonHint: { ...type.caption, color: c.secondary, paddingHorizontal: space.lg, marginTop: space.sm, lineHeight: 18 },
  });
