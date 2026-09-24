import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNotePlayer } from '../audio/useNotePlayer';
import { Fretboard, Marker } from '../components/Fretboard';
import { AnalyzerPanel } from './AnalyzerPanel';
import { Chip, ChipRow, DisplayPicker, KeyPicker, Section, styles as ui, ToggleRow } from '../components/ui';
import { useSettings } from '../state/settings';
import { colors, fonts, space } from '../theme';
import { CHORD_TYPES, chordById, ChordId, chordName, chordPcs, chordToneLabel } from '../theory/chords';
import { FRET_COUNT, noteName, pcAt, prefersFlats, STRING_COUNT, voicingToMidi } from '../theory/notes';
import { generateVoicings, voicingTab } from '../theory/voicings';

export function ChordsScreen() {
  const { settings, notation, t } = useSettings();
  const { playStrum } = useNotePlayer();
  const [typeId, setTypeId] = useState<ChordId>('maj');
  const [index, setIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [naming, setNaming] = useState(false);

  const root = settings.keyRoot;
  const flats = prefersFlats(root);
  const chord = chordById(typeId);
  const voicings = useMemo(() => generateVoicings(root, chord), [root, chord]);

  useEffect(() => setIndex(0), [root, typeId]);

  const voicing = voicings[index];

  const labelFor = (pc: number) =>
    settings.display === 'notes'
      ? noteName(pc, notation, flats)
      : settings.display === 'intervals'
        ? chordToneLabel(chord, root, pc)
        : undefined;

  const markers = useMemo(() => {
    const out: Marker[] = [];
    const taken = new Set<string>();
    if (voicing) {
      voicing.frets.forEach((f, s) => {
        if (f === null) return;
        const pc = pcAt(s, f);
        taken.add(`${s}-${f}`);
        out.push({ string: s, fret: f, kind: pc === root ? 'root' : 'chord', label: labelFor(pc) });
      });
    }
    if (showAll) {
      const pcs = chordPcs(root, chord);
      for (let s = 0; s < STRING_COUNT; s++) {
        for (let f = 0; f <= FRET_COUNT; f++) {
          const pc = pcAt(s, f);
          if (!pcs.includes(pc) || taken.has(`${s}-${f}`)) continue;
          out.push({ string: s, fret: f, kind: 'ghost', label: labelFor(pc) });
        }
      }
    }
    return out;
  }, [voicing, showAll, root, chord, settings.display, notation, flats]);

  const muted = voicing ? voicing.frets.map((f, s) => (f === null ? s : -1)).filter((s) => s >= 0) : [];

  return (
    <View>
      <KeyPicker label={t.root} />
      <Section title={t.chordType}>
        <ChipRow>
          {CHORD_TYPES.map((c) => (
            <Chip
              key={c.id}
              label={chordName(root, c, notation, flats)}
              selected={c.id === typeId}
              onPress={() => setTypeId(c.id)}
            />
          ))}
        </ChipRow>
      </Section>

      <View style={s.header}>
        <Text style={s.chordName}>{chordName(root, chord, notation, flats)}</Text>
        <Text style={s.chordType}>{t.chords[chord.id]}</Text>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => voicing && playStrum(voicingToMidi(voicing.frets))}
          disabled={!voicing}
          accessibilityRole="button"
          accessibilityLabel={t.listen}
          style={[s.listen, !voicing && { opacity: 0.35 }]}
        >
          <Text style={s.listenText}>{t.listen}</Text>
        </Pressable>
      </View>

      <Section>
        <DisplayPicker />
      </Section>

      <Section>
        <Fretboard markers={markers} muted={muted} focusFret={voicing?.minFret} />
      </Section>

      {voicing ? (
        <View style={s.nav}>
          <NavButton label={t.prev} disabled={index === 0} onPress={() => setIndex((i) => i - 1)} />
          <View style={s.navCenter}>
            <Text style={s.tab}>{voicingTab(voicing)}</Text>
            <Text style={s.meta}>
              {t.position} {index + 1} {t.of} {voicings.length},{' '}
              {voicing.minFret === 0 ? t.openPosition.toLowerCase() : `${t.fret.toLowerCase()} ${voicing.minFret}`}
            </Text>
          </View>
          <NavButton
            label={t.next}
            disabled={index >= voicings.length - 1}
            onPress={() => setIndex((i) => i + 1)}
          />
        </View>
      ) : (
        <Section>
          <Text style={ui.body}>{t.noVoicing}</Text>
        </Section>
      )}

      <ToggleRow label={t.showAllTones} value={showAll} onChange={setShowAll} />

      <Pressable
        onPress={() => setNaming(true)}
        accessibilityRole="button"
        style={s.nameChord}
      >
        <Text style={s.nameChordText}>{t.nameChord}</Text>
      </Pressable>

      {/* The analyzer used to be its own tab. It is a tool you reach for while
          looking at chords, so it now opens from here. */}
      <Modal
        visible={naming}
        animationType="slide"
        onRequestClose={() => setNaming(false)}
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={s.sheet}>
          <View style={s.sheetBar}>
            <Text style={s.sheetTitle}>{t.nameChord}</Text>
            <Pressable onPress={() => setNaming(false)} accessibilityRole="button" style={s.sheetClose}>
              <Text style={s.sheetCloseText}>{t.close}</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: space.xl * 2 }}>
            <AnalyzerPanel />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function NavButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[s.navButton, disabled && { opacity: 0.35 }]}
    >
      <Text style={s.navText}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: space.lg, marginTop: space.xl, flexDirection: 'row', alignItems: 'baseline' },
  chordName: { color: colors.text, fontSize: 40, fontFamily: fonts.display },
  chordType: { color: colors.muted, fontSize: 15, marginLeft: space.md },
  nav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, marginTop: space.md },
  navCenter: { flex: 1, alignItems: 'center' },
  tab: { color: colors.text, fontSize: 18, fontWeight: '700', letterSpacing: 2 },
  meta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  navButton: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navText: { color: colors.text, fontWeight: '600', fontSize: 14 },
  listen: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listenText: { color: colors.text, fontWeight: '600', fontSize: 15 },
  nameChord: {
    minHeight: 44,
    marginHorizontal: space.lg,
    marginTop: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nameChordText: { color: colors.text, fontWeight: '600', fontSize: 15 },
  sheet: { flex: 1, backgroundColor: colors.bg },
  sheetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sheetTitle: { color: colors.text, fontSize: 20, fontFamily: fonts.display },
  sheetClose: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.sm },
  sheetCloseText: { color: colors.gold, fontWeight: '600', fontSize: 15 },
});
