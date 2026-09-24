import { mod12, noteName, Notation } from './notes';

export type ChordId =
  | 'maj' | 'min' | 'sus2' | 'sus4' | 'add9' | 'dom7' | 'maj7' | 'min7' | 'six'
  | 'dim' | 'm7b5' | 'dim7' | 'aug' | 'dom9' | 'maj9' | 'min9';

export interface ChordType {
  id: ChordId;
  symbol: string;
  intervals: number[]; // semitones above root (9ths written as 2)
  labels: string[]; // degree label for each interval, same order
}

export const CHORD_TYPES: ChordType[] = [
  { id: 'maj', symbol: '', intervals: [0, 4, 7], labels: ['1', '3', '5'] },
  { id: 'min', symbol: 'm', intervals: [0, 3, 7], labels: ['1', '♭3', '5'] },
  { id: 'sus2', symbol: 'sus2', intervals: [0, 2, 7], labels: ['1', '2', '5'] },
  { id: 'sus4', symbol: 'sus4', intervals: [0, 5, 7], labels: ['1', '4', '5'] },
  { id: 'add9', symbol: 'add9', intervals: [0, 4, 7, 2], labels: ['1', '3', '5', '9'] },
  { id: 'dom7', symbol: '7', intervals: [0, 4, 7, 10], labels: ['1', '3', '5', '♭7'] },
  { id: 'maj7', symbol: 'maj7', intervals: [0, 4, 7, 11], labels: ['1', '3', '5', '7'] },
  { id: 'min7', symbol: 'm7', intervals: [0, 3, 7, 10], labels: ['1', '♭3', '5', '♭7'] },
  { id: 'six', symbol: '6', intervals: [0, 4, 7, 9], labels: ['1', '3', '5', '6'] },
  { id: 'dim', symbol: '°', intervals: [0, 3, 6], labels: ['1', '♭3', '♭5'] },
  { id: 'm7b5', symbol: 'm7♭5', intervals: [0, 3, 6, 10], labels: ['1', '♭3', '♭5', '♭7'] },
  { id: 'dim7', symbol: '°7', intervals: [0, 3, 6, 9], labels: ['1', '♭3', '♭5', '♭♭7'] },
  { id: 'aug', symbol: '+', intervals: [0, 4, 8], labels: ['1', '3', '♯5'] },
  { id: 'dom9', symbol: '9', intervals: [0, 4, 7, 10, 2], labels: ['1', '3', '5', '♭7', '9'] },
  { id: 'maj9', symbol: 'maj9', intervals: [0, 4, 7, 11, 2], labels: ['1', '3', '5', '7', '9'] },
  { id: 'min9', symbol: 'm9', intervals: [0, 3, 7, 10, 2], labels: ['1', '♭3', '5', '♭7', '9'] },
];

export const chordById = (id: ChordId) => CHORD_TYPES.find((c) => c.id === id)!;

export const chordPcs = (root: number, chord: ChordType) => chord.intervals.map((i) => mod12(root + i));

export function chordToneLabel(chord: ChordType, root: number, pc: number): string | undefined {
  const i = chord.intervals.findIndex((iv) => mod12(root + iv) === mod12(pc));
  return i >= 0 ? chord.labels[i] : undefined;
}

export function chordName(root: number, chord: ChordType, notation: Notation, flats: boolean) {
  return noteName(root, notation, flats) + chord.symbol;
}

/**
 * Suffix spellings seen in the wild, mapped to the chord we know.
 *
 * ChordPro files are written by hand or exported by other tools, so a chord will
 * arrive as `min7`, `m7`, `-7` or `MI7`. Anything unrecognised is reported as
 * unknown rather than guessed at, because a wrong chord is worse than none.
 */
const SUFFIX_ALIASES: Record<string, ChordId> = {
  '': 'maj',
  maj: 'maj',
  M: 'maj',
  m: 'min',
  min: 'min',
  '-': 'min',
  sus: 'sus4',
  sus4: 'sus4',
  sus2: 'sus2',
  add9: 'add9',
  '2': 'add9',
  '7': 'dom7',
  dom7: 'dom7',
  maj7: 'maj7',
  M7: 'maj7',
  Δ7: 'maj7',
  m7: 'min7',
  min7: 'min7',
  '-7': 'min7',
  '6': 'six',
  maj6: 'six',
  M6: 'six',
  '°': 'dim',
  dim: 'dim',
  o: 'dim',
  'm7b5': 'm7b5',
  'm7♭5': 'm7b5',
  'ø': 'm7b5',
  '°7': 'dim7',
  dim7: 'dim7',
  o7: 'dim7',
  '+': 'aug',
  aug: 'aug',
  '9': 'dom9',
  dom9: 'dom9',
  maj9: 'maj9',
  M9: 'maj9',
  m9: 'min9',
  min9: 'min9',
};

/** Note letters as they are written, sharps and flats alike. */
const LETTER_PCS: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
  Do: 0, Ré: 2, Re: 2, Mi: 4, Fa: 5, Sol: 7, La: 9, Si: 11,
};

const LETTERS = Object.keys(LETTER_PCS).sort((a, b) => b.length - a.length);

export interface ParsedChord {
  root: number;
  chord: ChordId;
  /** Slash bass, as a pitch class, or null. */
  bass: number | null;
}

/** A note name at the head of a symbol: its pitch class and how long it was. */
function readNote(text: string): { pc: number; length: number } | null {
  const letter = LETTERS.find((l) => text.toLowerCase().startsWith(l.toLowerCase()));
  if (!letter) return null;
  let pc = LETTER_PCS[letter];
  let length = letter.length;
  // At most one accidental: Cb and B# are legal, C## is not worth reading.
  const accidental = text[length];
  if (accidental === '#' || accidental === '♯') {
    pc += 1;
    length += 1;
  } else if (accidental === 'b' || accidental === '♭') {
    pc -= 1;
    length += 1;
  }
  return { pc: mod12(pc), length };
}

/** A note name on its own, as a pitch class: `F#`, `Bb`, `Sol`. */
export function parseNoteName(text: string): number | null {
  const trimmed = text.trim();
  const note = readNote(trimmed);
  // The whole string has to be the note: `Gm` is a chord, not a G.
  return note && note.length === trimmed.length ? note.pc : null;
}

/**
 * Reads a written chord symbol such as `G`, `Am7`, `D/F#` or `Cadd9`.
 *
 * Returns null rather than a guess: the caller shows what it could not read, and
 * a silently wrong chord would teach the wrong shape.
 */
export function parseChordSymbol(text: string): ParsedChord | null {
  const raw = text.trim();
  if (!raw) return null;
  const slash = raw.indexOf('/');
  const head = slash === -1 ? raw : raw.slice(0, slash);
  const tail = slash === -1 ? '' : raw.slice(slash + 1);

  const note = readNote(head);
  if (!note) return null;
  const chord = SUFFIX_ALIASES[head.slice(note.length)];
  if (!chord) return null;

  if (!tail) return { root: note.pc, chord, bass: null };
  const bass = readNote(tail);
  return bass ? { root: note.pc, chord, bass: bass.pc } : null;
}
