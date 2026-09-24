/**
 * Le chiffrage Nashville : les degrés d'une tonalité, pas des noms d'accords.
 *
 * C'est la langue des grilles de louange. « 1 5 6m 4 » se transpose sans rien
 * réécrire : le même chiffre donne un autre accord selon la tonalité du jour, et
 * c'est exactement ce qu'on veut d'un chant qu'on joue tantôt en Ré, tantôt en
 * Sol. Les accords ne sont calculés qu'à l'affichage.
 */
import { ChordId, parseChordSymbol } from './chords';
import { mod12, Notation, noteName, prefersFlats } from './notes';

export type Mode = 'major' | 'minor';

export interface NashvilleChord {
  root: number;
  chord: ChordId;
  /** La basse d'un accord renversé, en classe de hauteur, ou null. */
  bass: number | null;
}

/** Les demi-tons de chaque degré, depuis la tonique. */
const SCALE: Record<Mode, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

/**
 * La qualité de chaque degré quand la grille n'en écrit pas.
 *
 * En majeur : I ii iii IV V vi vii°. En mineur naturel : i ii° III iv v VI VII.
 * Une grille de louange écrit presque toujours ses qualités — « 6m », « 2m » —
 * donc ce défaut ne sert qu'aux chiffres nus.
 */
const DIATONIC_QUALITY: Record<Mode, ChordId[]> = {
  major: ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'],
  minor: ['min', 'dim', 'maj', 'min', 'min', 'maj', 'maj'],
};

/** Un degré, sa qualité écrite, et une basse facultative : `5/7`, `2m7`. */
const DEGREE = /^([1-7])([^/]*)(?:\/([1-7]))?$/;

/** Les qualités telles qu'on les écrit dans une grille, par accord connu. */
const SUFFIX: Record<ChordId, string> = {
  maj: '',
  min: 'm',
  sus2: 'sus2',
  sus4: 'sus4',
  add9: 'add9',
  dom7: '7',
  maj7: 'maj7',
  min7: 'm7',
  six: '6',
  dim: '°',
  m7b5: 'm7♭5',
  dim7: '°7',
  aug: '+',
  dom9: '9',
  maj9: 'maj9',
  min9: 'm9',
};

/**
 * La qualité écrite après un degré, lue par le même analyseur que les accords.
 *
 * `parseChordSymbol` connaît déjà toutes les façons d'écrire un accord — `-7`,
 * `Δ7`, `ø`, `maj7` — et les traduire une seconde fois ici serait le meilleur
 * moyen de les faire diverger. On lui donne donc un accord sur do et on ne garde
 * que sa qualité.
 */
function readQuality(suffix: string): ChordId | null {
  if (!suffix) return 'maj';
  const parsed = parseChordSymbol(`C${suffix}`);
  return parsed ? parsed.chord : null;
}

/** `5/7` en sol donne ré/fa♯. Renvoie null sur un degré illisible. */
export function nashvilleToChord(degree: string, key: number, mode: Mode): NashvilleChord | null {
  const match = DEGREE.exec(degree.trim());
  if (!match) return null;
  const step = Number(match[1]) - 1;
  const quality = readQuality(match[2]);
  if (quality === null) return null;

  const scale = SCALE[mode];
  const root = mod12(key + scale[step]);
  const chord = match[2] ? quality : DIATONIC_QUALITY[mode][step];
  const bass = match[3] ? mod12(key + scale[Number(match[3]) - 1]) : null;
  return { root, chord, bass };
}

/**
 * Le degré d'une classe de hauteur dans la tonalité.
 *
 * Une note hors de la gamme n'est pas une erreur : elle s'écrit avec une
 * altération, ♭7 ou ♯4, comme le ferait un arrangeur.
 */
function degreeOf(pc: number, key: number, mode: Mode): string {
  const semitone = mod12(pc - key);
  const scale = SCALE[mode];
  const exact = scale.indexOf(semitone);
  if (exact >= 0) return String(exact + 1);
  const flat = scale.indexOf(semitone + 1);
  if (flat >= 0) return `♭${flat + 1}`;
  const sharp = scale.indexOf(semitone - 1);
  if (sharp >= 0) return `♯${sharp + 1}`;
  return String(semitone);
}

/**
 * L'inverse : `{ D, maj, basse F♯ }` en sol donne `5/7`.
 *
 * Seul l'accord parfait majeur s'écrit sans qualité : on écrit « 1 », « 4 », « 5 »
 * mais « 2m », « 6m », « 7° ». C'est la convention de l'app — celle du tableau des
 * accords diatoniques — et elle évite d'avoir à se souvenir quel degré est mineur
 * par nature pour lire une grille.
 */
export function chordToNashville(chord: NashvilleChord, key: number, mode: Mode = 'major'): string {
  const degree = degreeOf(chord.root, key, mode);
  const written = chord.chord === 'maj' ? '' : SUFFIX[chord.chord];
  const bass = chord.bass === null ? '' : `/${degreeOf(chord.bass, key, mode)}`;
  return `${degree}${written}${bass}`;
}

/** La grille lisible d'un accord : `5/7` en sol s'écrit « D/F♯ ». */
export function nashvilleLabel(chord: NashvilleChord, key: number, mode: Mode, notation: Notation): string {
  const flats = prefersFlats(key);
  const name = noteName(chord.root, notation, flats) + SUFFIX[chord.chord];
  return chord.bass === null ? name : `${name}/${noteName(chord.bass, notation, flats)}`;
}
