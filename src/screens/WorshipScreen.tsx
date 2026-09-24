import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Fretboard, Marker } from '../components/Fretboard';
import { KeyPicker, Screen, SectionHeader, useTextStyles } from '../components/ui';
import { useSettings } from '../state/settings';
import { NECK, Theme, useStyles } from '../theme';
import { chordById, chordName, chordToneLabel } from '../theory/chords';
import { mod12, noteName, pcAt, prefersFlats } from '../theory/notes';
import { generateVoicings, voicingTab } from '../theory/voicings';
import { capoOptions, COMMON_WORSHIP_KEYS, DIATONIC, PROGRESSIONS } from '../theory/worship';
import { SetsPanel } from './SetsPanel';

export function WorshipScreen() {
  const { settings, notation, t } = useSettings();
  const s = useStyles(makeStyles);
  const ui = useTextStyles();
  const [selected, setSelected] = useState(0);
  const [progIndex, setProgIndex] = useState(0);

  const key = settings.keyRoot;
  const flats = prefersFlats(key);
  const nameInKey = (k: number, i: number) => {
    const d = DIATONIC[i];
    return chordName(mod12(k + d.degree), chordById(d.type), notation, prefersFlats(k));
  };

  const d = DIATONIC[selected];
  const chordRoot = mod12(key + d.degree);
  const chord = chordById(d.type);
  const voicing = useMemo(() => generateVoicings(chordRoot, chord)[0], [chordRoot, chord]);

  const markers: Marker[] = voicing
    ? voicing.frets.flatMap((f, s) => {
        if (f === null) return [];
        const pc = pcAt(s, f);
        const label =
          settings.display === 'intervals'
            ? chordToneLabel(chord, chordRoot, pc)
            : settings.display === 'notes'
              ? noteName(pc, notation, flats)
              : undefined;
        return [{ string: s, fret: f, kind: pc === chordRoot ? 'root' : 'chord', label } as Marker];
      })
    : [];
  const muted = voicing ? voicing.frets.map((f, s) => (f === null ? s : -1)).filter((s) => s >= 0) : [];
  const progression = PROGRESSIONS[progIndex];

  return (
    <Screen tab="worship" title={t.tabs.worship}>
      <SetsPanel />

      <KeyPicker label={t.key} highlight={COMMON_WORSHIP_KEYS} />
      <Text style={[ui.hint, s.keyHint]}>{t.worship.commonKeyHint}</Text>

      <SectionHeader>{t.worship.diatonic}</SectionHeader>
      <Text style={ui.hint}>{t.worship.diatonicHint}</Text>
      <View style={s.grid}>
        {DIATONIC.map((dc, i) => (
          <Pressable
            key={dc.roman}
            onPress={() => setSelected(i)}
            accessibilityRole="button"
            accessibilityState={{ selected: selected === i }}
            style={[s.cell, selected === i && s.cellActive]}
          >
            <Text style={[s.cellName, selected === i && s.inkText]}>{nameInKey(key, i)}</Text>
            <Text style={[s.cellNum, selected === i && s.inkText]}>{dc.nashville}</Text>
          </Pressable>
        ))}
      </View>

      <View style={s.block}>
        <Fretboard markers={markers} muted={muted} focusFret={voicing?.minFret} />
        {voicing && <Text style={s.tab}>{voicingTab(voicing)}</Text>}
      </View>

      <SectionHeader>{t.worship.progressions}</SectionHeader>
      {PROGRESSIONS.map((p, i) => (
        <Pressable
          key={p.join('-')}
          onPress={() => setProgIndex(i)}
          accessibilityRole="button"
          style={[s.row, progIndex === i && s.rowActive]}
        >
          <Text style={s.rowNums}>{p.map((x) => DIATONIC[x].nashville).join('  ')}</Text>
          <Text style={s.rowNames}>{p.map((x) => nameInKey(key, x)).join('  ')}</Text>
        </Pressable>
      ))}

      <SectionHeader>{t.worship.capo}</SectionHeader>
      <Text style={ui.hint}>{t.worship.capoHint}</Text>
      {capoOptions(key).map((o) => (
        <View key={o.shapeKey} style={s.row}>
          <Text style={s.rowNums}>{t.worship.capoRow(o.capo, noteName(o.shapeKey, notation, false))}</Text>
          <Text style={s.rowNames}>{progression.map((x) => nameInKey(o.shapeKey, x)).join('  ')}</Text>
        </View>
      ))}
    </Screen>
  );
}

const makeStyles = ({ c, type, space, radius }: Theme) =>
  StyleSheet.create({
    keyHint: { marginTop: space.sm },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.lg, gap: space.sm },
    cell: {
      width: '23%',
      minWidth: 72,
      paddingVertical: space.sm,
      borderRadius: radius.chip,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.separator,
      alignItems: 'center',
    },
    // The chosen cell is filled **and** outlined: the fill alone would be a
    // difference of colour, which is no difference at all to some readers.
    cellActive: { backgroundColor: c.accent, borderColor: NECK.nut, borderWidth: 2 },
    cellName: { ...type.cardTitle, color: c.label },
    cellNum: { ...type.caption, color: c.secondary, marginTop: 2 },
    inkText: { color: c.onAccent },
    tab: {
      ...type.subhead,
      color: c.secondary,
      textAlign: 'center',
      letterSpacing: 2,
      marginTop: space.xs,
      fontWeight: '600',
    },
    // The block that stood in an untitled `Section`: only its top margin mattered.
    block: { marginTop: space.lg },
    row: {
      marginHorizontal: space.lg,
      paddingVertical: space.md,
      paddingHorizontal: space.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.separator,
      // A transparent accent keeps every row the same width; the chosen one thickens
      // it, so the selection is a shape and not only a shade.
      borderLeftWidth: 3,
      borderLeftColor: 'transparent',
    },
    rowActive: { backgroundColor: c.card, borderRadius: radius.icon, borderLeftColor: c.accent },
    rowNums: { ...type.caption, color: c.secondary },
    rowNames: { ...type.cardTitle, color: c.label, marginTop: 2 },
  });
