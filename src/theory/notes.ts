export const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** Standard tuning, index 0 = low E (6th string) → index 5 = high E (1st string). */
export const STANDARD_TUNING = [4, 9, 2, 7, 11, 4];
export const OPEN_MIDI = [40, 45, 50, 55, 59, 64];
export const FRET_COUNT = 15;
export const STRING_COUNT = 6;

export type Notation = 'anglo' | 'latin';
export type Fret = number | null; // null = muted string

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const LATIN: Record<string, string> = { C: 'Do', D: 'Ré', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };

/** Keys spelled with flats: Db, Eb, F, Ab, Bb. */
const FLAT_KEY_ROOTS = [1, 3, 5, 8, 10];
export const prefersFlats = (keyRoot: number) => FLAT_KEY_ROOTS.includes(mod12(keyRoot));

export function noteName(pc: number, notation: Notation, flats: boolean): string {
  const raw = (flats ? FLATS : SHARPS)[mod12(pc)];
  const letter = raw[0];
  const accidental = raw.slice(1);
  const base = notation === 'latin' ? LATIN[letter] : letter;
  const glyph = accidental === '#' ? '♯' : accidental === 'b' ? '♭' : '';
  return base + glyph;
}

export const keyLabel = (pc: number, notation: Notation) => noteName(pc, notation, prefersFlats(pc));

export const INTERVAL_LABELS = ['1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7'];

export const pcAt = (string: number, fret: number) => mod12(STANDARD_TUNING[string] + fret);

/** Sounding pitch of a fretted note, counting from the open string. */
export const fretToMidi = (string: number, fret: number) => OPEN_MIDI[string] + fret;

/**
 * Pitches of a voicing, low string first, muted strings dropped.
 *
 * Low string first is the order a hand sounds them, so this is also the order to
 * feed a strum: reversing it would strum upward.
 */
export function voicingToMidi(frets: Fret[]): number[] {
  const out: number[] = [];
  frets.forEach((f, s) => {
    if (f !== null) out.push(OPEN_MIDI[s] + f);
  });
  return out;
}
