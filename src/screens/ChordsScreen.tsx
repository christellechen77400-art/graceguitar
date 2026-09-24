import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNotePlayer } from '../audio/useNotePlayer';
import { Fretboard, Marker } from '../components/Fretboard';
import {
  Card,
  Chip,
  ChipRow,
  DisplayPicker,
  KeyPicker,
  Screen,
  SecondaryButton,
  Sheet,
  SectionHeader,
  Toggle,
  useTextStyles,
} from '../components/ui';
import { useSettings } from '../state/settings';
import { Theme, useStyles } from '../theme';
import { cagedShapeFor, CagedQuality } from '../theory/caged';
import { CHORD_TYPES, chordById, ChordId, chordName, chordPcs, chordToneLabel } from '../theory/chords';
import { FRET_COUNT, noteName, pcAt, prefersFlats, STRING_COUNT, voicingToMidi } from '../theory/notes';
import { generateVoicings, voicingTab } from '../theory/voicings';
import { AnalyzerPanel } from './AnalyzerPanel';

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

  // La forme ouverte dont cette position est la transposition, s'il y en a une.
  // La plupart des positions jouables n'en sont pas : le générateur ignore que
  // les cinq formes existent, et lui en coller une serait mentir.
  const shape = useMemo(() => {
    if (!voicing) return null;
    const quality: CagedQuality = chord.id === 'min' || chord.id === 'min7' ? 'min' : 'maj';
    return cagedShapeFor(voicing.frets, root, quality);
  }, [voicing, chord, root]);

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
    <Screen tab="chords" title={t.tabs.chords}>
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

      {/* L'affichage se règle avant la carte : il décide de ce que portent les
          pastilles du manche, pas de la carte elle-même. */}
      <View style={s.section}>
        <DisplayPicker />
      </View>

      <View style={s.card}>
        <Card>
          <View style={s.cardHead}>
            <View style={s.cardText}>
              <Text style={s.chordName}>{chordName(root, chord, notation, flats)}</Text>
              <Text style={ui.hint}>{t.chords[chord.id]}</Text>
            </View>
            <SecondaryButton
              label={t.listen}
              disabled={!voicing}
              onPress={() => voicing && playStrum(voicingToMidi(voicing.frets))}
            />
          </View>

          <View style={s.board}>
            <Fretboard markers={markers} muted={muted} focusFret={voicing?.minFret} />
          </View>
        </Card>
      </View>

      {voicing ? (
        <>
          {/* Sous la carte, ce qui décrit la position : où l'on en est, d'où elle
              vient, et comment la poser. */}
          <View style={s.position}>
            <Text style={s.meta}>
              {t.position} {index + 1} {t.of} {voicings.length},{' '}
              {voicing.minFret === 0 ? t.openPosition.toLowerCase() : `${t.fret.toLowerCase()} ${voicing.minFret}`}
            </Text>
            {shape ? (
              <Text style={s.shape}>
                {t.neck.cagedShape(
                  shape.shape,
                  voicing.minFret === 0
                    ? t.openPosition.toLowerCase()
                    : `${t.fret.toLowerCase()} ${voicing.minFret}`,
                )}
              </Text>
            ) : null}
            <Text style={s.tab}>{voicingTab(voicing)}</Text>
          </View>

          <View style={s.nav}>
            <SecondaryButton
              label={t.prev}
              style={s.grow}
              disabled={index === 0}
              onPress={() => setIndex((i) => i - 1)}
            />
            <SecondaryButton
              label={t.next}
              style={s.grow}
              disabled={index >= voicings.length - 1}
              onPress={() => setIndex((i) => i + 1)}
            />
          </View>
        </>
      ) : (
        <View style={s.section}>
          <Text style={ui.body}>{t.noVoicing}</Text>
        </View>
      )}

      <Toggle label={t.showAllTones} value={showAll} onChange={setShowAll} />

      {/* L'analyseur était un onglet. C'est un outil qu'on sort en regardant des
          accords, donc il s'ouvre d'ici, dans une feuille. */}
      <View style={s.nameChord}>
        <SecondaryButton label={t.nameChord} onPress={() => setNaming(true)} />
      </View>

      <Sheet visible={naming} title={t.nameChord} onClose={() => setNaming(false)} closeLabel={t.close}>
        <AnalyzerPanel />
      </Sheet>
    </Screen>
  );
}

const makeStyles = ({ c, type, space }: Theme) =>
  StyleSheet.create({
    /** Le bloc d'une section sans titre : la même respiration qu'un `SectionHeader`. */
    section: { marginTop: space.xl },
    card: { marginTop: space.lg },
    cardHead: { flexDirection: 'row', alignItems: 'center' },
    cardText: { flex: 1 },
    chordName: { ...type.chordName, color: c.label },
    board: { marginTop: space.lg },
    /** Ce qui décrit la position, centré sous la carte. */
    position: { alignItems: 'center', marginTop: space.lg, paddingHorizontal: space.lg },
    meta: { ...type.caption, color: c.secondary },
    shape: { ...type.caption, color: c.accent, marginTop: 2 },
    tab: { ...type.headline, color: c.label, letterSpacing: 2, marginTop: space.sm },
    nav: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, marginTop: space.lg },
    grow: { flex: 1 },
    nameChord: { marginHorizontal: space.lg, marginTop: space.xl },
  });
