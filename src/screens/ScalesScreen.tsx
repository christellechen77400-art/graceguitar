import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Fretboard, Marker, MarkerKind } from '../components/Fretboard';
import { Chip, ChipRow, DisplayPicker, KeyPicker, Section, ToggleRow } from '../components/ui';
import { useSettings } from '../state/settings';
import { chordById, ChordId, chordPcs, chordToneLabel, chordName } from '../theory/chords';
import { FRET_COUNT, INTERVAL_LABELS, mod12, noteName, pcAt, prefersFlats, STRING_COUNT } from '../theory/notes';
import { SCALES, scaleById, ScaleId } from '../theory/scales';

const LAYER_TYPES: ChordId[] = ['maj', 'min', 'dom7', 'maj7', 'min7', 'sus4', 'dim'];

export function ScalesScreen() {
  const { settings, notation, t } = useSettings();
  const [scaleId, setScaleId] = useState<ScaleId>('major');
  const [targets, setTargets] = useState<number[]>([]);
  const [layerOn, setLayerOn] = useState(false);
  const [layerOffset, setLayerOffset] = useState(0);
  const [layerType, setLayerType] = useState<ChordId>('maj');

  const root = settings.keyRoot;
  const flats = prefersFlats(root);
  const scale = scaleById(scaleId);

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
        out.push({ string: s, fret: f, kind: pc === root && !inChord ? 'root' : kind, label, ring: isTarget, dim });
      }
    }
    return out;
  }, [root, scale, targets, layerOn, layerOffset, layerType, settings.display, notation, flats]);

  const toggleTarget = (offset: number) =>
    setTargets((prev) => (prev.includes(offset) ? prev.filter((o) => o !== offset) : [...prev, offset]));

  return (
    <View>
      <KeyPicker label={t.key} />
      <Section title={t.scale}>
        <ChipRow>
          {SCALES.map((s) => (
            <Chip key={s.id} label={t.scales[s.id]} selected={s.id === scaleId} onPress={() => setScaleId(s.id)} />
          ))}
        </ChipRow>
      </Section>

      <Section>
        <DisplayPicker />
      </Section>

      <Section>
        <Fretboard markers={markers} />
      </Section>

      <Section title={t.targets} hint={t.targetsHint}>
        <ChipRow>
          {scale.intervals.map((i) => (
            <Chip key={i} label={INTERVAL_LABELS[i]} selected={targets.includes(i)} onPress={() => toggleTarget(i)} />
          ))}
        </ChipRow>
      </Section>

      <ToggleRow label={t.chordLayer} value={layerOn} onChange={setLayerOn} />
      {layerOn && (
        <>
          <Section title={t.chordLayerRoot}>
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
          </Section>
          <Section title={t.chordType}>
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
          </Section>
        </>
      )}
    </View>
  );
}
