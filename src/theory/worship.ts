import { ChordId } from './chords';
import { Mode, NashvilleChord, nashvilleToChord } from './nashville';
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

/**
 * The lowest capo that lets the player keep the shapes they like.
 *
 * A capo is a compromise: the song sounds in its key, the fingers stay on the
 * shapes they know. So we look for the smallest capo — the one that leaves the
 * most neck free — whose shape is one the player ticked at the welcome, and only
 * fall back on the usual open shapes when none of theirs lands on the key. Capo 0
 * is a real answer, and the best one: no capo at all.
 */
export function suggestCapo(key: number, preferredShapes: number[], maxCapo = 7): number {
  const first = (shapes: number[]) => {
    for (let capo = 0; capo <= maxCapo; capo++) {
      if (shapes.includes(mod12(key - capo))) return capo;
    }
    return -1;
  };
  const preferred = preferredShapes.length > 0 ? first(preferredShapes) : -1;
  return preferred >= 0 ? preferred : Math.max(first(CAPO_SHAPES), 0);
}

/**
 * The chords a worship song in this key is most likely to use, in the order the
 * quick-entry buttons offer them.
 *
 * 1, 4, 5 and 6m carry most of the repertoire; 2m and 3m come next, and are the
 * ones that make a chart sound written rather than guessed. The seventh degree
 * is left out: it is rare enough that writing it by hand is faster than finding
 * it in a list.
 */
export function probableChords(key: number, mode: Mode = 'major'): { nashville: string; chord: NashvilleChord }[] {
  const degrees = mode === 'major' ? ['1', '4', '5', '6m', '2m', '3m'] : ['1m', '4m', '5m', '6', '3', '7'];
  return degrees.flatMap((nashville) => {
    const chord = nashvilleToChord(nashville, key, mode);
    return chord ? [{ nashville, chord }] : [];
  });
}
