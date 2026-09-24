import { CHORD_TYPES, ChordType } from './chords';
import { Fret, mod12, OPEN_MIDI } from './notes';

export interface ChordMatch {
  root: number;
  chord: ChordType;
  bass: number;
  exact: boolean;
}

export interface Analysis {
  pcs: number[];
  bass: number | null;
  matches: ChordMatch[];
}

export function analyze(frets: Fret[]): Analysis {
  const midis = frets
    .map((f, s) => (f === null ? null : OPEN_MIDI[s] + f))
    .filter((m): m is number => m !== null);
  if (!midis.length) return { pcs: [], bass: null, matches: [] };

  const bass = mod12(Math.min(...midis));
  const pcs = [...new Set(midis.map(mod12))];
  const matches: ChordMatch[] = [];

  for (const root of pcs) {
    for (const chord of CHORD_TYPES) {
      const cp = chord.intervals.map((i) => mod12(root + i));
      if (!pcs.every((p) => cp.includes(p))) continue;
      const missing = cp.filter((p) => !pcs.includes(p));
      const fifthDropped =
        cp.length >= 4 && missing.length === 1 && missing[0] === mod12(root + 7) && chord.intervals.includes(7);
      if (missing.length && !fifthDropped) continue;
      matches.push({ root, chord, bass, exact: missing.length === 0 });
    }
  }

  const score = (m: ChordMatch) => (m.root === bass ? 0 : 10) + (m.exact ? 0 : 3) + m.chord.intervals.length;
  matches.sort((a, b) => score(a) - score(b));
  return { pcs, bass, matches };
}
