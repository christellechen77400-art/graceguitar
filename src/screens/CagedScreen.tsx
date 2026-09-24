import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Fretboard, Marker } from '../components/Fretboard';
import { Chip, ChipRow, DisplayPicker, KeyPicker, Section, Segmented, ToggleRow } from '../components/ui';
import { useSettings } from '../state/settings';
import { CagedQuality, CagedShape, getCagedShapes } from '../theory/caged';
import { chordById, chordToneLabel } from '../theory/chords';
import { FRET_COUNT, INTERVAL_LABELS, mod12, noteName, pcAt, prefersFlats, STRING_COUNT } from '../theory/notes';
import { scaleById } from '../theory/scales';

export function CagedScreen() {
  const { settings, notation, t } = useSettings();
  const [quality, setQuality] = useState<CagedQuality>('maj');
  const [shape, setShape] = useState<CagedShape | 'all'>('all');
  const [scaleAround, setScaleAround] = useState(true);

  const root = settings.keyRoot;
  const flats = prefersFlats(root);
  const shapes = useMemo(() => getCagedShapes(root, quality), [root, quality]);
  const active = shape === 'all' ? shapes : shapes.filter((p) => p.shape === shape);
  const chord = chordById(quality);

  const markers = useMemo(() => {
    const byCell = new Map<string, Marker>();
    for (const pos of active) {
      pos.frets.forEach((f, s) => {
        if (f === null) return;
        const pc = pcAt(s, f);
        let label: string | undefined;
        if (settings.display === 'notes') label = noteName(pc, notation, flats);
        else if (settings.display === 'intervals') label = chordToneLabel(chord, root, pc);
        else if (shape === 'all' && pc === root) label = pos.shape;
        byCell.set(`${s}-${f}`, { string: s, fret: f, kind: pc === root ? 'root' : 'chord', label });
      });
    }

    if (scaleAround && shape !== 'all' && active[0]) {
      const pos = active[0];
      const pcs = scaleById(quality === 'maj' ? 'major' : 'minor').intervals.map((i) => mod12(root + i));
      const lo = Math.max(0, pos.lo - 1);
      const hi = Math.min(FRET_COUNT, pos.hi + 1);
      for (let s = 0; s < STRING_COUNT; s++) {
        for (let f = lo; f <= hi; f++) {
          const pc = pcAt(s, f);
          if (!pcs.includes(pc) || byCell.has(`${s}-${f}`)) continue;
          const label =
            settings.display === 'notes'
              ? noteName(pc, notation, flats)
              : settings.display === 'intervals'
                ? INTERVAL_LABELS[mod12(pc - root)]
                : undefined;
          byCell.set(`${s}-${f}`, { string: s, fret: f, kind: 'ghost', label });
        }
      }
    }
    return [...byCell.values()];
  }, [active, shape, scaleAround, root, quality, chord, settings.display, notation, flats]);

  return (
    <View>
      <KeyPicker label={t.root} />
      <Section title={t.quality}>
        <Segmented<CagedQuality>
          value={quality}
          onChange={setQuality}
          options={[
            { value: 'maj', label: t.major },
            { value: 'min', label: t.minor },
          ]}
        />
      </Section>
      <Section title={t.shape}>
        <ChipRow>
          <Chip label={t.all} selected={shape === 'all'} onPress={() => setShape('all')} />
          {shapes.map((p) => (
            <Chip
              key={p.shape}
              label={`${p.shape} (${p.lo})`}
              selected={shape === p.shape}
              onPress={() => setShape(p.shape)}
            />
          ))}
        </ChipRow>
      </Section>
      <Section>
        <DisplayPicker />
      </Section>
      <Section>
        <Fretboard markers={markers} focusFret={shape === 'all' ? undefined : active[0]?.lo} />
      </Section>
      {shape !== 'all' && <ToggleRow label={t.showScaleAround} value={scaleAround} onChange={setScaleAround} />}
    </View>
  );
}
