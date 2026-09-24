import { ChordId } from './chords';
import { mod12 } from './notes';

export interface DiatonicChord {
  degree: number; // semitones above the key root
  type: ChordId;
  roman: string;
  nashville: string;
}

export const DIATONIC: DiatonicChord[] = [
  { degree: 0, type: 'maj', roman: 'I', nashville: '1' },
  { degree: 2, type: 'min', roman: 'ii', nashville: '2m' },
  { degree: 4, type: 'min', roman: 'iii', nashville: '3m' },
  { degree: 5, type: 'maj', roman: 'IV', nashville: '4' },
  { degree: 7, type: 'maj', roman: 'V', nashville: '5' },
  { degree: 9, type: 'min', roman: 'vi', nashville: '6m' },
  { degree: 11, type: 'dim', roman: 'vii°', nashville: '7°' },
];

/** Progressions as indexes into DIATONIC. */
export const PROGRESSIONS: number[][] = [
  [0, 4, 5, 3],
  [0, 3, 5, 4],
  [5, 3, 0, 4],
  [3, 0, 4, 5],
  [0, 3, 0, 4],
  [0, 5, 3, 4],
  [1, 3, 0, 4],
];

/** Keys worship songs are most often played in: C, D, E, G, A, B♭, B. */
export const COMMON_WORSHIP_KEYS = [0, 2, 4, 7, 9, 10, 11];

/** Open-chord families guitarists like to play with a capo: G, C, D, A, E. */
export const CAPO_SHAPES = [7, 0, 2, 9, 4];

/**
 * The three shapes most worship songs are actually played in, and so the ones
 * the welcome question ticks by default. A player who prefers something else
 * says so; the rest get a sensible capo without having to think about it.
 */
export const DEFAULT_CAPO_SHAPES = [7, 0, 2];

export interface CapoOption {
  shapeKey: number;
  capo: number;
}

export function capoOptions(key: number, maxCapo = 7): CapoOption[] {
  return CAPO_SHAPES.map((shapeKey) => ({ shapeKey, capo: mod12(key - shapeKey) }))
    .filter((o) => o.capo <= maxCapo)
    .sort((a, b) => a.capo - b.capo);
}
