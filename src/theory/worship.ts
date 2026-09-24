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
const CAPO_SHAPE_KEYS = [7, 0, 2, 9, 4];

export interface CapoOption {
  shapeKey: number;
  capo: number;
}

export function capoOptions(key: number, maxCapo = 7): CapoOption[] {
  return CAPO_SHAPE_KEYS.map((shapeKey) => ({ shapeKey, capo: mod12(key - shapeKey) }))
    .filter((o) => o.capo <= maxCapo)
    .sort((a, b) => a.capo - b.capo);
}
