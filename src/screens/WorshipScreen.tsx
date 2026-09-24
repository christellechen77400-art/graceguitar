import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Fretboard, Marker } from '../components/Fretboard';
import { KeyPicker, Section, styles as ui } from '../components/ui';
import { useSettings } from '../state/settings';
import { colors, fonts, space } from '../theme';
import { chordById, chordName, chordToneLabel } from '../theory/chords';
import { mod12, noteName, pcAt, prefersFlats } from '../theory/notes';
import { generateVoicings, voicingTab } from '../theory/voicings';
import { capoOptions, COMMON_WORSHIP_KEYS, DIATONIC, PROGRESSIONS } from '../theory/worship';
import { SetsPanel } from './SetsPanel';

export function WorshipScreen() {
  const { settings, notation, t } = useSettings();
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
    <View>
      <KeyPicker label={t.key} highlight={COMMON_WORSHIP_KEYS} />
      <Text style={[ui.hint, { marginTop: space.sm }]}>{t.worship.commonKeyHint}</Text>

      <Section title={t.worship.diatonic} hint={t.worship.diatonicHint}>
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
      </Section>

      <Section>
        <Fretboard markers={markers} muted={muted} focusFret={voicing?.minFret} />
        {voicing && <Text style={s.tab}>{voicingTab(voicing)}</Text>}
      </Section>

      <Section title={t.worship.progressions}>
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
      </Section>

      <Section title={t.worship.capo} hint={t.worship.capoHint}>
        {capoOptions(key).map((o) => (
          <View key={o.shapeKey} style={s.row}>
            <Text style={s.rowNums}>{t.worship.capoRow(o.capo, noteName(o.shapeKey, notation, false))}</Text>
            <Text style={s.rowNames}>{progression.map((x) => nameInKey(o.shapeKey, x)).join('  ')}</Text>
          </View>
        ))}
      </Section>

      <SetsPanel />
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.lg, gap: space.sm },
  cell: {
    width: '23%',
    minWidth: 72,
    paddingVertical: space.sm,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cellActive: { backgroundColor: colors.gold, borderColor: colors.cream, borderWidth: 2 },
  cellName: { color: colors.text, fontSize: 20, fontFamily: fonts.display },
  cellNum: { color: colors.muted, fontSize: 12, marginTop: 2 },
  inkText: { color: colors.ink, fontWeight: '700' },
  tab: { color: colors.muted, textAlign: 'center', letterSpacing: 2, marginTop: space.xs, fontWeight: '600' },
  row: {
    marginHorizontal: space.lg,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    // A transparent accent keeps every row the same width; the chosen one thickens
    // it, so the selection is a shape and not only a shade.
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  rowActive: { backgroundColor: colors.surface, borderRadius: 8, borderLeftColor: colors.gold },
  rowNums: { color: colors.muted, fontSize: 13 },
  rowNames: { color: colors.text, fontSize: 18, fontFamily: fonts.display, marginTop: 2 },
});
