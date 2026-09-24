import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Fretboard, Marker } from '../components/Fretboard';
import { DisplayPicker, useTextStyles } from '../components/ui';
import { useSettings } from '../state/settings';
import { Theme, useStyles } from '../theme';
import { analyze } from '../theory/analyzer';
import { chordName, chordToneLabel } from '../theory/chords';
import { Fret, noteName, pcAt, prefersFlats } from '../theory/notes';

const EMPTY: Fret[] = [null, null, null, null, null, null];

export function AnalyzerPanel() {
  const { settings, notation, t } = useSettings();
  const ui = useTextStyles();
  const s = useStyles(makeStyles);
  const [frets, setFrets] = useState<Fret[]>(EMPTY);

  const result = useMemo(() => analyze(frets), [frets]);
  const best = result.matches[0];
  const flats = best ? prefersFlats(best.root) : false;

  const nameOf = (m: NonNullable<typeof best>) =>
    chordName(m.root, m.chord, notation, prefersFlats(m.root)) +
    (m.bass !== m.root ? `/${noteName(m.bass, notation, prefersFlats(m.root))}` : '');

  const markers: Marker[] = frets.flatMap((f, s) => {
    if (f === null) return [];
    const pc = pcAt(s, f);
    let label: string | undefined;
    if (settings.display === 'notes') label = noteName(pc, notation, flats);
    if (settings.display === 'intervals' && best) label = chordToneLabel(best.chord, best.root, pc);
    const kind = best ? (pc === best.root ? 'root' : 'chord') : 'tone';
    return [{ string: s, fret: f, kind, label } as Marker];
  });

  const onPressCell = (s: number, f: number) =>
    setFrets((prev) => prev.map((cur, i) => (i === s ? (cur === f ? null : f) : cur)));

  return (
    <View>
      <View style={s.section}>
        <Text style={ui.hint}>{t.analyzerHint}</Text>
        <DisplayPicker />
      </View>
      <View style={s.section}>
        <Fretboard markers={markers} onPressCell={onPressCell} />
      </View>

      <View style={s.result}>
        <Text style={ui.sectionTitle}>{t.detected}</Text>
        {best ? (
          <Text style={s.name}>{nameOf(best)}</Text>
        ) : (
          <Text style={ui.body}>{result.pcs.length ? t.noMatch : t.noNotes}</Text>
        )}
        {result.matches.length > 1 && (
          <Text style={[ui.body, s.alt]}>
            {t.alsoReadAs} {result.matches.slice(1, 4).map(nameOf).join(', ')}
          </Text>
        )}
        {result.pcs.length > 0 && (
          <Text style={[ui.body, s.alt]}>
            {t.notesPlayed} : {result.pcs.map((pc) => noteName(pc, notation, flats)).join(' ')}
          </Text>
        )}
      </View>

      <Pressable onPress={() => setFrets(EMPTY)} style={s.clear} accessibilityRole="button">
        <Text style={s.clearText}>{t.clear}</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = ({ c, type, space }: Theme) =>
  StyleSheet.create({
    /** Le bloc d'une section sans titre : la même respiration qu'un `SectionHeader`. */
    section: { marginTop: space.xl },
    result: { marginTop: space.xl },
    name: { ...type.chordName, color: c.accent, paddingHorizontal: space.lg },
    alt: { color: c.secondary, marginTop: space.xs },
    clear: {
      alignSelf: 'flex-start',
      marginLeft: space.lg,
      marginTop: space.lg,
      paddingHorizontal: space.lg,
      paddingVertical: space.sm,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.separator,
    },
    clearText: { ...type.headline, color: c.label },
  });
