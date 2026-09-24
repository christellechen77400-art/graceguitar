import { ChordType, chordPcs } from './chords';
import { Fret, FRET_COUNT, mod12, OPEN_MIDI, STANDARD_TUNING } from './notes';

export interface Voicing {
  frets: Fret[]; // index 0 = low E
  minFret: number; // lowest fret used (0 if open strings only)
}

/**
 * Generates playable root-position voicings algorithmically (no copied chord books):
 * 4-fret windows, max 4 fingers (a barre counts as one), at most one interior muted
 * string, all chord tones present (the 5th may be dropped on 4+ note chords).
 */
export function generateVoicings(root: number, chord: ChordType, limit = 16): Voicing[] {
  const pcs = chordPcs(root, chord);
  const fifth = mod12(root + 7);
  const fifthOptional = pcs.length >= 4 && chord.intervals.includes(7);
  const required = pcs.filter((p) => !(fifthOptional && p === fifth));
  const minStrings = pcs.length >= 4 ? 4 : 3;
  const found = new Map<string, Voicing>();

  const evaluate = (frets: Fret[]) => {
    const sounding = frets.map((f, s) => (f === null ? -1 : s)).filter((s) => s >= 0);
    if (sounding.length < minStrings) return;

    const first = sounding[0];
    const last = sounding[sounding.length - 1];
    const gaps = last - first + 1 - sounding.length;
    if (gaps > 1) return;

    let bassMidi = Infinity;
    let bassPc = -1;
    const present = new Set<number>();
    for (const s of sounding) {
      const midi = OPEN_MIDI[s] + (frets[s] as number);
      present.add(mod12(midi));
      if (midi < bassMidi) {
        bassMidi = midi;
        bassPc = mod12(midi);
      }
    }
    if (bassPc !== mod12(root)) return;
    if (!required.every((p) => present.has(p))) return;

    const fretted = sounding.map((s) => frets[s] as number).filter((f) => f > 0);
    if (fretted.length) {
      const lo = Math.min(...fretted);
      const hi = Math.max(...fretted);
      if (hi - lo > 3) return;
      const atLo = fretted.filter((f) => f === lo).length;
      const fingers = fretted.length - atLo + 1;
      if (fingers > 4) return;
    }

    const key = frets.map((f) => (f === null ? 'x' : String(f))).join(',');
    if (!found.has(key)) {
      found.set(key, { frets: [...frets], minFret: fretted.length ? Math.min(...fretted) : 0 });
    }
  };

  for (let start = 0; start <= FRET_COUNT - 3; start++) {
    const lo = Math.max(1, start);
    const hi = start + 3;
    const options: Fret[][] = STANDARD_TUNING.map((open) => {
      const opts: Fret[] = [null];
      if (start <= 1 && pcs.includes(mod12(open))) opts.push(0);
      for (let f = lo; f <= hi; f++) if (pcs.includes(mod12(open + f))) opts.push(f);
      return opts;
    });
    const current: Fret[] = new Array(6).fill(null);
    const walk = (s: number) => {
      if (s === 6) return evaluate(current);
      for (const o of options[s]) {
        current[s] = o;
        walk(s + 1);
      }
    };
    walk(0);
  }

  // Drop voicings that are a subset of a fuller voicing (same frets, fewer strings).
  const all = [...found.values()];
  const count = (v: Voicing) => v.frets.filter((f) => f !== null).length;
  const isSubset = (a: Voicing, b: Voicing) =>
    count(a) < count(b) && a.frets.every((f, s) => f === null || f === b.frets[s]);
  const kept = all.filter((a) => !all.some((b) => isSubset(a, b)));

  kept.sort((a, b) => a.minFret - b.minFret || count(b) - count(a));
  return kept.slice(0, limit);
}

export const voicingTab = (v: Voicing) => v.frets.map((f) => (f === null ? 'x' : String(f))).join(' ');
