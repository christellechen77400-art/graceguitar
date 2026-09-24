import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Fretboard, Marker, MarkerKind } from '../components/Fretboard';
import { Section, styles as ui } from '../components/ui';
import { dailyRun, heat, Question, streak } from '../practice/engine';
import { today } from '../songs/model';
import { useSettings } from '../state/settings';
import { colors, fonts, space } from '../theme';
import { RunScreen } from './Run';

/**
 * What the record says: how many days in a row, and which positions are known.
 *
 * The heat map is a fretboard of mastery. Each practised cell carries its own
 * success rate as a number on the dot, so the map reads the same to someone who
 * cannot tell lilac from gold — the colour is a second cue, never the only one.
 */
export function ProgressionPanel() {
  const { settings, t } = useSettings();
  const [run, setRun] = useState<Question[] | null>(null);

  const cells = useMemo(() => heat(settings.practice, settings.progress), [settings.practice, settings.progress]);
  const practised = cells.filter((c) => c.attempts > 0);
  const days = streak(settings.practiceDays, today());

  const markers: Marker[] = cells.map((c) => {
    if (c.rate === null) return { string: c.string, fret: c.fret, kind: 'ghost' as MarkerKind };
    const pct = Math.round(c.rate * 100);
    const kind: MarkerKind = c.rate >= 0.8 ? 'root' : c.rate >= 0.4 ? 'tone' : 'chord';
    return { string: c.string, fret: c.fret, kind, label: `${pct}` };
  });

  if (run) return <RunScreen questions={run} onExit={() => setRun(null)} />;

  return (
    <View>
      <Text style={s.title}>{t.progression.title}</Text>

      <View style={s.streak}>
        <Text style={s.streakNumber}>{days}</Text>
        <View style={s.streakText}>
          <Text style={s.streakLabel}>{t.progression.streak}</Text>
          <Text style={ui.hint}>{t.progression.streakHint}</Text>
        </View>
      </View>

      <Section title={t.progression.heat} hint={t.progression.heatHint}>
        {practised.length ? (
          <Fretboard markers={markers} />
        ) : (
          <Text style={ui.hint}>{t.progression.noData}</Text>
        )}
        <Text style={s.tally}>
          {t.progression.seen} : {practised.length} / {cells.length}
        </Text>
      </Section>

      <Section title={t.progression.session} hint={t.progression.sessionHint}>
        <Pressable
          onPress={() => setRun(dailyRun(settings.practice, settings.progress, Date.now() % 100000))}
          accessibilityRole="button"
          style={s.start}
        >
          <Text style={s.startText}>{t.progression.startSession}</Text>
        </Pressable>
      </Section>
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
  streak: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, marginTop: space.md },
  streakNumber: { color: colors.gold, fontSize: 44, fontFamily: fonts.display, minWidth: 56 },
  streakText: { flex: 1 },
  streakLabel: { color: colors.text, fontSize: 16, fontWeight: '600' },
  tally: { color: colors.muted, fontSize: 13, paddingHorizontal: space.lg, marginTop: space.sm },
  start: {
    minHeight: 50,
    marginHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.gold,
  },
  startText: { color: colors.ink, fontWeight: '700', fontSize: 16 },
});
