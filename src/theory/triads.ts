/**
 * Les triades dans une zone du manche.
 *
 * Une triade (tonique, tierce, quinte) se joue sur trois cordes voisines. Chaque
 * accord de la grille a donc plusieurs formes sur le manche, une par renversement
 * et par position. Plutôt que de laisser la main sauter d'une case 1 à une case 7,
 * on fixe une zone — par exemple les cases 5 à 10 — et on cherche, dans cette zone,
 * l'enchaînement où la main bouge le moins.
 *
 * Référence : `docs/verification/zone_chain.py`. Ce module en est le portage, avec
 * les mêmes résultats sur les chants d'essai (`docs/TESTS.md`).
 *
 * Pur : aucune dépendance à React.
 */
import { ChordId } from './chords';
import { FRET_COUNT, mod12, OPEN_MIDI } from './notes';

export type TriadQuality = 'maj' | 'min';

export interface TriadChord {
  root: number;
  quality: TriadQuality;
}

/**
 * Les trois jeux de cordes, des plus aiguës aux plus graves.
 *
 * Index 0 = mi grave … 5 = mi aigu. `la-ré-sol` est le moins pratique : sur une
 * fenêtre étroite, certaines triades n'existent pas (voir `coverageGaps`).
 */
export const STRING_SETS = {
  'sol-si-mi': [3, 4, 5],
  're-sol-si': [2, 3, 4],
  'la-re-sol': [1, 2, 3],
} as const;

export type StringSetId = keyof typeof STRING_SETS;
export const STRING_SET_IDS = Object.keys(STRING_SETS) as StringSetId[];

/** 0 = fondamentale, 1 = premier renversement (tierce à la basse), 2 = second. */
export type Inversion = 0 | 1 | 2;

export interface TriadVoicing {
  /** Les cases, de la corde la plus grave du jeu à la plus aiguë. */
  frets: [number, number, number];
  inversion: Inversion;
}

const THIRD: Record<TriadQuality, number> = { maj: 4, min: 3 };

/**
 * La triade qui correspond à un accord de la grille, ou null.
 *
 * Les accords enrichis (7, maj7, add9, 6, 9) se jouent avec la triade de leur
 * base : la septième ou la neuvième s'ajoutent à la mélodie, pas à ce voicing.
 * Les suspendus sont ramenés au majeur, ce que la grille d'un chant de louange
 * veut dire presque toujours ; l'écran le signale. Le diminué et l'augmenté n'ont
 * pas de triade majeure ou mineure : on répond null plutôt que de deviner.
 */
export function triadOf(chord: ChordId): { quality: TriadQuality; simplified: boolean } | null {
  switch (chord) {
    case 'maj':
      return { quality: 'maj', simplified: false };
    case 'min':
      return { quality: 'min', simplified: false };
    case 'add9':
    case 'dom7':
    case 'maj7':
    case 'six':
    case 'dom9':
    case 'maj9':
    case 'sus2':
    case 'sus4':
      return { quality: 'maj', simplified: true };
    case 'min7':
    case 'min9':
      return { quality: 'min', simplified: true };
    default:
      return null;
  }
}

export const triadTones = (chord: TriadChord): number[] => [
  mod12(chord.root),
  mod12(chord.root + THIRD[chord.quality]),
  mod12(chord.root + 7),
];

const pcAtString = (string: number, fret: number) => mod12(OPEN_MIDI[string] + fret);

/**
 * Toutes les formes d'une triade sur un jeu de cordes, cases dans [lo, hi].
 *
 * `maxSpan` est l'écart de cases toléré entre le doigt le plus bas et le plus
 * haut : 2 tient dans une main sans étirement. Les formes sortent dans l'ordre
 * des cases (corde grave d'abord), ce qui rend le résultat reproductible.
 */
export function triadVoicings(
  chord: TriadChord,
  set: StringSetId,
  lo: number,
  hi: number,
  maxSpan = 2,
): TriadVoicing[] {
  const tones = triadTones(chord);
  const [a, b, c] = STRING_SETS[set];
  const out: TriadVoicing[] = [];
  const low = Math.max(0, lo);
  const high = Math.min(FRET_COUNT, hi);
  for (let fa = low; fa <= high; fa++) {
    for (let fb = low; fb <= high; fb++) {
      for (let fc = low; fc <= high; fc++) {
        const notes = [pcAtString(a, fa), pcAtString(b, fb), pcAtString(c, fc)];
        if (new Set(notes).size !== 3 || !notes.every((n) => tones.includes(n))) continue;
        if (Math.max(fa, fb, fc) - Math.min(fa, fb, fc) > maxSpan) continue;
        const bass = notes[0];
        const inversion: Inversion = bass === tones[0] ? 0 : bass === tones[1] ? 1 : 2;
        out.push({ frets: [fa, fb, fc], inversion });
      }
    }
  }
  return out;
}

const distance = (x: TriadVoicing, y: TriadVoicing) =>
  Math.abs(x.frets[0] - y.frets[0]) + Math.abs(x.frets[1] - y.frets[1]) + Math.abs(x.frets[2] - y.frets[2]);

export interface Chain {
  /** Le déplacement total des doigts, en cases, d'un accord au suivant. */
  total: number;
  path: TriadVoicing[];
}

/**
 * L'enchaînement qui bouge le moins, par programmation dynamique.
 *
 * `fixed` impose une forme à certains accords (par position dans la grille) :
 * c'est ce que fait « Choisir » dans la liste des inversions, et les autres
 * accords se recalculent autour. Renvoie null si un accord n'a aucune forme dans
 * la zone ; `coverageGaps` dit lesquels.
 */
export function bestChain(
  chords: TriadChord[],
  set: StringSetId,
  lo: number,
  hi: number,
  fixed: Record<number, TriadVoicing> = {},
  maxSpan = 2,
): Chain | null {
  if (!chords.length) return { total: 0, path: [] };
  const layers = chords.map((chord, index) => {
    const pinned = fixed[index];
    return pinned ? [pinned] : triadVoicings(chord, set, lo, hi, maxSpan);
  });
  if (layers.some((layer) => !layer.length)) return null;

  // cost[k][j] = déplacement minimal pour finir sur la forme j de l'accord k.
  const cost: number[][] = [layers[0].map(() => 0)];
  const from: number[][] = [layers[0].map(() => -1)];
  for (let k = 1; k < layers.length; k++) {
    const costs: number[] = [];
    const parents: number[] = [];
    layers[k].forEach((next) => {
      let best = Infinity;
      let parent = 0;
      layers[k - 1].forEach((prev, i) => {
        const value = cost[k - 1][i] + distance(prev, next);
        // Strictement inférieur : à égalité, la première forme trouvée reste.
        if (value < best) {
          best = value;
          parent = i;
        }
      });
      costs.push(best);
      parents.push(parent);
    });
    cost.push(costs);
    from.push(parents);
  }

  const last = cost[cost.length - 1];
  let j = 0;
  for (let i = 1; i < last.length; i++) if (last[i] < last[j]) j = i;
  const total = last[j];
  const path: TriadVoicing[] = [];
  for (let k = layers.length - 1; k >= 0; k--) {
    path.push(layers[k][j]);
    j = from[k][j];
  }
  return { total, path: path.reverse() };
}

/** Les accords qui n'ont aucune forme dans la zone, par position dans la grille. */
export function coverageGaps(chords: TriadChord[], set: StringSetId, lo: number, hi: number): number[] {
  return chords.flatMap((chord, index) => (triadVoicings(chord, set, lo, hi).length ? [] : [index]));
}

/**
 * Toutes les formes d'une triade sur tout le manche, par renversement puis par
 * position : c'est la liste de « Toutes les inversions ».
 */
export function allInversions(chord: TriadChord, set: StringSetId): TriadVoicing[] {
  return triadVoicings(chord, set, 0, FRET_COUNT).sort(
    (x, y) => x.inversion - y.inversion || Math.min(...x.frets) - Math.min(...y.frets),
  );
}

/** La forme la plus basse et la plus haute d'une forme, pour dire « cases 5 à 7 ». */
export const voicingRange = (v: TriadVoicing): [number, number] => [Math.min(...v.frets), Math.max(...v.frets)];

export const inZone = (v: TriadVoicing, lo: number, hi: number): boolean => {
  const [a, b] = voicingRange(v);
  return a >= lo && b <= hi;
};

export interface Movement {
  /** Pour chaque corde du jeu (0 = la plus grave), de combien de cases elle bouge. */
  deltas: [number, number, number];
  /** Combien de cordes bougent. */
  moved: number;
}

/** Ce qui bouge entre deux formes : sert à la phrase « seule la corde de si bouge ». */
export function movement(from: TriadVoicing, to: TriadVoicing): Movement {
  const deltas: [number, number, number] = [
    to.frets[0] - from.frets[0],
    to.frets[1] - from.frets[1],
    to.frets[2] - from.frets[2],
  ];
  return { deltas, moved: deltas.filter((d) => d !== 0).length };
}

/** Une triade reconnue à partir de ses cases : sert à contrôler une forme. */
export function triadPitchClasses(set: StringSetId, frets: readonly number[]): number[] {
  return STRING_SETS[set].map((string, i) => pcAtString(string, frets[i]));
}
