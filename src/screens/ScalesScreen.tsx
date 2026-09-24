import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Fretboard, Marker, MarkerKind } from '../components/Fretboard';
import {
  Chip,
  ChipRow,
  DisplayPicker,
  KeyPicker,
  SectionHeader,
  Toggle,
  useTextStyles,
} from '../components/ui';
import { useSettings } from '../state/settings';
import { Theme, useStyles } from '../theme';
import { CagedQuality, CagedShape, getCagedShapes } from '../theory/caged';
import { chordById, ChordId, chordPcs, chordToneLabel, chordName } from '../theory/chords';
import { FRET_COUNT, INTERVAL_LABELS, mod12, noteName, pcAt, prefersFlats, STRING_COUNT } from '../theory/notes';
import { SCALES, scaleById, ScaleId } from '../theory/scales';

const LAYER_TYPES: ChordId[] = ['maj', 'min', 'dom7', 'maj7', 'min7', 'sus4', 'dim'];

/**
 * La gamme et les cinq formes ouvertes se répondent : la gamme dit quelles notes
 * sont disponibles, la forme dit où la main se pose. L'interrupteur superpose
 * l'une à l'autre, et la forme est cerclée plutôt que colorée — un anneau se voit
 * même quand on ne distingue pas deux nuances.
 */
export function ScalesScreen() {
  const { settings, notation, t } = useSettings();
  const ui = useTextStyles();
  const s = useStyles(makeStyles);
  const [scaleId, setScaleId] = useState<ScaleId>('major');
  const [targets, setTargets] = useState<number[]>([]);
  const [layerOn, setLayerOn] = useState(false);
  const [layerOffset, setLayerOffset] = useState(0);
  const [layerType, setLayerType] = useState<ChordId>('maj');
  const [cagedOn, setCagedOn] = useState(false);
  const [cagedShape, setCagedShape] = useState<CagedShape | 'all'>('all');

  const root = settings.keyRoot;
  const flats = prefersFlats(root);
  const scale = scaleById(scaleId);
  const cagedQuality: CagedQuality = scaleId === 'minor' || scaleId === 'minorPent' ? 'min' : 'maj';
  const shapes = useMemo(() => getCagedShapes(root, cagedQuality), [root, cagedQuality]);

  /** La case de chaque corde couverte par la forme choisie. */
  const cagedCells = useMemo(() => {
    if (!cagedOn) return new Set<string>();
    const chosen = cagedShape === 'all' ? shapes : shapes.filter((p) => p.shape === cagedShape);
    const cells = new Set<string>();
    for (const pos of chosen) {
      pos.frets.forEach((f, string) => {
        if (f !== null) cells.add(`${string}-${f}`);
      });
    }
    return cells;
  }, [cagedOn, cagedShape, shapes]);

  useEffect(() => {
    setTargets([]);
    setLayerOffset(0);
  }, [scaleId]);

  const markers = useMemo(() => {
    const scalePcs = scale.intervals.map((i) => mod12(root + i));
    const chord = chordById(layerType);
    const chordRoot = mod12(root + layerOffset);
    const layerPcs = layerOn ? chordPcs(chordRoot, chord) : [];
    const out: Marker[] = [];

    for (let s = 0; s < STRING_COUNT; s++) {
      for (let f = 0; f <= FRET_COUNT; f++) {
        const pc = pcAt(s, f);
        const inScale = scalePcs.includes(pc);
        const inChord = layerPcs.includes(pc);
        if (!inScale && !inChord) continue;
        const offset = mod12(pc - root);
        const kind: MarkerKind = inChord ? 'chord' : pc === root ? 'root' : 'tone';
        const isTarget = targets.includes(offset);
        const dim =
          (layerOn && !inChord && pc !== root) || (targets.length > 0 && !isTarget && pc !== root && !inChord);
        let label: string | undefined;
        if (settings.display === 'notes') label = noteName(pc, notation, flats);
        if (settings.display === 'intervals') {
          label = inChord ? chordToneLabel(chord, chordRoot, pc) : INTERVAL_LABELS[offset];
        }
        out.push({
          string: s,
          fret: f,
          kind: pc === root && !inChord ? 'root' : kind,
          label,
          ring: isTarget || cagedCells.has(`${s}-${f}`),
          dim,
        });
      }
    }
    return out;
  }, [root, scale, targets, layerOn, layerOffset, layerType, settings.display, notation, flats, cagedCells]);

  const toggleTarget = (offset: number) =>
    setTargets((prev) => (prev.includes(offset) ? prev.filter((o) => o !== offset) : [...prev, offset]));

  return (
    <View>
      <KeyPicker label={t.key} />
      <SectionHeader>{t.scale}</SectionHeader>
      <ChipRow>
        {SCALES.map((s) => (
          <Chip key={s.id} label={t.scales[s.id]} selected={s.id === scaleId} onPress={() => setScaleId(s.id)} />
        ))}
      </ChipRow>

      <View style={s.section}>
        <DisplayPicker />
      </View>

      <Toggle label={t.neck.showCaged} value={cagedOn} onChange={setCagedOn} />
      {cagedOn && (
        <ChipRow>
          <Chip label={t.all} selected={cagedShape === 'all'} onPress={() => setCagedShape('all')} />
          {shapes.map((p) => (
            <Chip
              key={p.shape}
              label={`${p.shape} (${p.lo})`}
              selected={cagedShape === p.shape}
              onPress={() => setCagedShape(p.shape)}
            />
          ))}
        </ChipRow>
      )}

      <View style={s.section}>
        <Fretboard markers={markers} />
      </View>

      <SectionHeader>{t.targets}</SectionHeader>
      <Text style={ui.hint}>{t.targetsHint}</Text>
      <ChipRow>
        {scale.intervals.map((i) => (
          <Chip key={i} label={INTERVAL_LABELS[i]} selected={targets.includes(i)} onPress={() => toggleTarget(i)} />
        ))}
      </ChipRow>

      <Toggle label={t.chordLayer} value={layerOn} onChange={setLayerOn} />
      {layerOn && (
        <>
          <SectionHeader>{t.chordLayerRoot}</SectionHeader>
          <ChipRow>
            {scale.intervals.map((i) => (
              <Chip
                key={i}
                label={noteName(root + i, notation, flats)}
                selected={layerOffset === i}
                onPress={() => setLayerOffset(i)}
              />
            ))}
          </ChipRow>
          <SectionHeader>{t.chordType}</SectionHeader>
          <ChipRow>
            {LAYER_TYPES.map((id) => (
              <Chip
                key={id}
                label={chordName(root + layerOffset, chordById(id), notation, flats)}
                selected={layerType === id}
                onPress={() => setLayerType(id)}
              />
            ))}
          </ChipRow>
        </>
      )}
    </View>
  );
}

const makeStyles = ({ space }: Theme) =>
  StyleSheet.create({
    /** Le bloc d'une section sans titre : la même respiration qu'un `SectionHeader`. */
    section: { marginTop: space.xl },
  });
