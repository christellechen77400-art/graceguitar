import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNotePlayer } from '../audio/useNotePlayer';
import { Fretboard, Marker } from '../components/Fretboard';
import { AnalyzerPanel } from './AnalyzerPanel';
import { Chip, ChipRow, DisplayPicker, KeyPicker, SectionHeader, Toggle, useTextStyles } from '../components/ui';
import { useSettings } from '../state/settings';
import { Theme, useStyles } from '../theme';
import { CHORD_TYPES, chordById, ChordId, chordName, chordPcs, chordToneLabel } from '../theory/chords';
import { FRET_COUNT, noteName, pcAt, prefersFlats, STRING_COUNT, voicingToMidi } from '../theory/notes';
import { generateVoicings, voicingTab } from '../theory/voicings';

export function ChordsScreen() {
  const { settings, notation, t } = useSettings();
  const ui = useTextStyles();
  const s = useStyles(makeStyles);
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
      <SectionHeader>{t.chordType}</SectionHeader>
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

      <View style={s.section}>
        <DisplayPicker />
      </View>

      <View style={s.section}>
        <Fretboard markers={markers} muted={muted} focusFret={voicing?.minFret} />
      </View>

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
        <View style={s.section}>
          <Text style={ui.body}>{t.noVoicing}</Text>
        </View>
      )}

      <Toggle label={t.showAllTones} value={showAll} onChange={setShowAll} />

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
          <ScrollView contentContainerStyle={s.sheetContent}>
            <AnalyzerPanel />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function NavButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  const s = useStyles(makeStyles);
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

const makeStyles = ({ c, type, space }: Theme) =>
  StyleSheet.create({
    /** Le bloc d'une section sans titre : la même respiration qu'un `SectionHeader`. */
    section: { marginTop: space.xl },
    sheetContent: { paddingBottom: space.xl * 2 },
    header: { paddingHorizontal: space.lg, marginTop: space.xl, flexDirection: 'row', alignItems: 'baseline' },
    chordName: { ...type.chordName, color: c.label },
    chordType: { ...type.subhead, color: c.secondary, marginLeft: space.md },
    nav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, marginTop: space.md },
    navCenter: { flex: 1, alignItems: 'center' },
    tab: { ...type.headline, color: c.label, letterSpacing: 2 },
    meta: { ...type.caption, color: c.secondary, marginTop: 2 },
    navButton: {
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      borderRadius: 8,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.separator,
    },
    navText: { ...type.headline, color: c.label },
    listen: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: space.lg,
      borderRadius: 10,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.separator,
    },
    listenText: { ...type.headline, color: c.label },
    nameChord: {
      minHeight: 44,
      marginHorizontal: space.lg,
      marginTop: space.xl,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.separator,
    },
    nameChordText: { ...type.headline, color: c.label },
    sheet: { flex: 1, backgroundColor: c.background },
    sheetBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space.lg,
      paddingVertical: space.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.separator,
    },
    sheetTitle: { ...type.cardTitle, color: c.label },
    sheetClose: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.sm },
    sheetCloseText: { ...type.headline, color: c.accent },
  });
