import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Chip, ChipRow, Section, ToggleRow } from '../components/ui';
import {
  ExerciseId,
  EXERCISES,
  makeRun,
  PracticeSettings,
  QUESTION_COUNTS,
  Question,
  ZONES,
} from '../practice/engine';
import { useSettings } from '../state/settings';
import { colors, fonts, space } from '../theme';
import { noteName, STANDARD_TUNING, STRING_COUNT } from '../theory/notes';
import { LessonsPanel } from './LessonsPanel';
import { ProgressionPanel } from './ProgressionPanel';
import { RunScreen } from './Run';

/**
 * The practice tab: what the record says, the exercises, the course, and the
 * settings they all run on.
 */
export function PracticeScreen() {
  const { settings, t } = useSettings();
  const [running, setRunning] = useState<Question[] | null>(null);
  const [progressOpen, setProgressOpen] = useState(true);

  if (running) return <RunScreen questions={running} onExit={() => setRunning(null)} />;

  const sections = (['neck', 'chordsEar'] as const).map((key) => ({
    key,
    ids: EXERCISES.filter((e) => e.section === key).map((e) => e.id),
  }));

  const start = (id: ExerciseId) => setRunning(makeRun(id, settings.practice, Date.now() % 100000));

  return (
    <View>
      <Text style={s.title}>{t.practice.title}</Text>

      <Pressable
        onPress={() => setProgressOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: progressOpen }}
        style={s.disclosure}
      >
        <Text style={s.disclosureText}>{t.progression.title}</Text>
        <Text style={s.chevron}>{progressOpen ? '⌄' : '›'}</Text>
      </Pressable>
      {progressOpen && <ProgressionPanel />}

      {sections.map((section) => (
        <Section key={section.key} title={t.practice.sections[section.key]}>
          {section.ids.map((id) => (
            <Pressable key={id} onPress={() => start(id)} accessibilityRole="button" style={s.row}>
              <Text style={s.rowLabel}>{t.practice.exercises[id]}</Text>
              <Text style={s.chevron}>›</Text>
            </Pressable>
          ))}
        </Section>
      ))}

      <SettingsSheet />
      <LessonsPanel />
    </View>
  );
}

/** Strings, fret zone, accidentals and length: remembered between runs. */
function SettingsSheet() {
  const { settings, t, update } = useSettings();
  const p = settings.practice;
  const set = (patch: Partial<PracticeSettings>) => update({ practice: { ...p, ...patch } });

  const toggleString = (string: number) => {
    const next = p.strings.includes(string)
      ? p.strings.filter((x) => x !== string)
      : [...p.strings, string].sort();
    // Never leave a run with nothing to ask about.
    if (next.length) set({ strings: next });
  };

  return (
    <View>
      <Section title={t.practice.settings} hint={t.practice.stringsHint}>
        <ChipRow>
          <Chip label={t.practice.oneString} onPress={() => set({ strings: [5] })} />
          <Chip label={t.practice.twoStrings} onPress={() => set({ strings: [4, 5] })} />
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
      </Section>

      <Section title={t.practice.zone}>
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
      </Section>

      <Section title={t.practice.questions}>
        <ChipRow>
          {QUESTION_COUNTS.map((n) => (
            <Chip
              key={n}
              label={String(n)}
              selected={p.questionCount === n}
              onPress={() => set({ questionCount: n })}
            />
          ))}
        </ChipRow>
      </Section>

      <ToggleRow
        label={t.practice.accidentals}
        value={p.accidentals}
        onChange={(accidentals) => set({ accidentals })}
      />
      <ToggleRow label={t.practice.timed} value={p.timed} onChange={(timed) => set({ timed })} />
    </View>
  );
}

const s = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 34,
    fontFamily: fonts.display,
    paddingHorizontal: space.lg,
    marginTop: space.md,
  },
  disclosure: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: space.lg,
    marginTop: space.md,
  },
  disclosureText: { color: colors.text, fontSize: 20, fontFamily: fonts.display },
  chevron: { color: colors.muted, fontSize: 22 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: { color: colors.text, fontSize: 17, flex: 1 },
});
