import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Fretboard, Marker, MarkerKind } from '../components/Fretboard';
import { SectionHeader, useTextStyles } from '../components/ui';
import { dailyRun, heat, Question, streak } from '../practice/engine';
import { today } from '../songs/model';
import { useSettings } from '../state/settings';
import { tabularNums, Theme, useStyles } from '../theme';
import { RunScreen } from './Run';

/**
 * What the record says: how many days in a row, and which positions are known.
 *
 * The heat map is a fretboard of mastery. Each practised cell carries its own
 * success rate as a number on the dot, and the three levels differ by outline as
 * well as by shade — a reader who cannot tell the two fills apart still sees
 * three shapes.
 *
 * Pas de titre ici : le panneau se pose sous celui de l'écran qui l'appelle, et
 * deux titres de suite se disputeraient la même ligne.
 */
export function ProgressionPanel() {
  const { settings, t } = useSettings();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const [run, setRun] = useState<Question[] | null>(null);

  const cells = useMemo(() => heat(settings.practice, settings.progress), [settings.practice, settings.progress]);
  const practised = cells.filter((c) => c.attempts > 0);
  const days = streak(settings.practiceDays, today());

  // Trois niveaux, trois silhouettes : accent cerclé, blanc cerclé, blanc. Les
  // tons `tone` et `chord` ont la même couleur depuis la nouvelle charte, donc
  // sans cet anneau les deux niveaux du bas seraient indiscernables.
  const markers: Marker[] = cells.map((c) => {
    if (c.rate === null) return { string: c.string, fret: c.fret, kind: 'ghost' as MarkerKind };
    const pct = Math.round(c.rate * 100);
    if (c.rate >= 0.8) return { string: c.string, fret: c.fret, kind: 'root' as MarkerKind, label: `${pct}` };
    if (c.rate >= 0.4) {
      return { string: c.string, fret: c.fret, kind: 'tone' as MarkerKind, ring: true, label: `${pct}` };
    }
    return { string: c.string, fret: c.fret, kind: 'chord' as MarkerKind, label: `${pct}` };
  });

  if (run) return <RunScreen questions={run} onExit={() => setRun(null)} />;

  return (
    <View>
      <View style={s.streak}>
        <Text style={s.streakNumber}>{days}</Text>
        <View style={s.streakText}>
          <Text style={s.streakLabel}>{t.progression.streak}</Text>
          <Text style={ui.hint}>{t.progression.streakHint}</Text>
        </View>
      </View>

      <SectionHeader>{t.progression.heat}</SectionHeader>
      <Text style={ui.hint}>{t.progression.heatHint}</Text>
      {practised.length ? (
        <Fretboard markers={markers} />
      ) : (
        <Text style={ui.hint}>{t.progression.noData}</Text>
      )}
      <Text style={s.tally}>
        {t.progression.seen} : {practised.length} / {cells.length}
      </Text>

      <SectionHeader>{t.progression.session}</SectionHeader>
      <Text style={ui.hint}>{t.progression.sessionHint}</Text>
      <Pressable
        onPress={() => setRun(dailyRun(settings.practice, settings.progress, Date.now() % 100000))}
        accessibilityRole="button"
        style={s.start}
      >
        <Text style={s.startText}>{t.progression.startSession}</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = ({ c, type, space, radius, size }: Theme) =>
  StyleSheet.create({
    streak: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, marginTop: space.md },
    streakNumber: { ...type.greeting, ...tabularNums, color: c.accent, minWidth: 56 },
    streakText: { flex: 1 },
    streakLabel: { ...type.headline, color: c.label },
    tally: { ...type.caption, ...tabularNums, color: c.secondary, paddingHorizontal: space.lg, marginTop: space.sm },
    start: {
      minHeight: size.button,
      marginHorizontal: space.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.button,
      backgroundColor: c.accent,
    },
    startText: { ...type.headline, color: c.onAccent },
  });
