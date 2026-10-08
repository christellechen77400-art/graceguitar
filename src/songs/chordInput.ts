/**
 * La saisie des accords d'un chant : du texte tapé ou collé vers des accords, et
 * des accords vers un chant enregistré.
 *
 * On tape comme on parle : « La Fa♯m Ré Mi », « A F#m D E », « Si m » avec une
 * espace, ou une grille ChordPro avec ses crochets. Ce qui ne se lit pas est
 * rendu à part, pour que l'écran le montre au lieu d'avaler l'accord en silence.
 *
 * Pur et testé.
 */
import { ChordId, parseChordSymbol } from '../theory/chords';
import { chordToNashville, Mode, nashvilleToChord } from '../theory/nashville';
import { triadOf, TriadChord } from '../theory/triads';
import { newId, Song, songChords } from './model';

export interface EnteredChord {
  root: number;
  chord: ChordId;
}

export interface ParsedEntry {
  chords: EnteredChord[];
  /** Les morceaux de texte qui n'étaient pas des accords. */
  unreadable: string[];
}

/** Un mot qui n'est qu'une qualité : « m » après « Si » dans « Si m ». */
const QUALITY_WORD = /^(m|min|mineur|-)$/i;
/** Un nom de note nu, sans qualité : « La », « F# », « Bb ». */
const BARE_NOTE = /^(do|ré|re|mi|fa|sol|la|si|[a-g])[#♯b♭]?$/i;
/** Ce qui sépare deux accords sans en être un : barres, répétitions, tirets longs. */
const NOISE = /^([|/\\]|[–—]|x\d+|\d+x|\.{2,}|%)$/i;

/** Les accords entre crochets d'une grille ChordPro, ou null s'il n'y en a pas. */
function bracketed(text: string): string[] | null {
  const found = [...text.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1].trim());
  return found.length ? found : null;
}

export function parseChordText(text: string): ParsedEntry {
  const tokens = bracketed(text) ?? text.split(/[\s,;|]+/).filter(Boolean);

  // « Si m » : la qualité arrive dans un mot à part, on la recolle à sa note.
  const glued: string[] = [];
  for (const token of tokens) {
    const previous = glued[glued.length - 1];
    if (previous && BARE_NOTE.test(previous) && QUALITY_WORD.test(token)) {
      glued[glued.length - 1] = `${previous}m`;
    } else {
      glued.push(token);
    }
  }

  const chords: EnteredChord[] = [];
  const unreadable: string[] = [];
  for (const token of glued) {
    if (NOISE.test(token)) continue;
    const parsed = parseChordSymbol(token);
    if (parsed) chords.push({ root: parsed.root, chord: parsed.chord });
    else unreadable.push(token);
  }
  return { chords, unreadable };
}

/**
 * Un accord, du point de vue des triades.
 *
 * `triad` est null quand l'accord n'a pas de triade majeure ou mineure (diminué,
 * augmenté) : l'écran le laisse de côté et le dit.
 */
export interface TriadEntry {
  /** La position de l'accord dans la grille saisie. */
  index: number;
  entered: EnteredChord;
  triad: TriadChord | null;
  simplified: boolean;
}

export function triadEntries(chords: EnteredChord[]): TriadEntry[] {
  return chords.map((entered, index) => {
    const triad = triadOf(entered.chord);
    return {
      index,
      entered,
      triad: triad ? { root: entered.root, quality: triad.quality } : null,
      simplified: triad?.simplified ?? false,
    };
  });
}

/**
 * La suite d'accords dont on cherche l'enchaînement : les accords sans triade
 * sautent, et le même accord deux fois de suite ne compte qu'une fois — la main
 * ne bouge pas pour rejouer ce qu'elle tient déjà.
 */
export function chainEntries(entries: TriadEntry[]): TriadEntry[] {
  const out: TriadEntry[] = [];
  for (const entry of entries) {
    if (!entry.triad) continue;
    const last = out[out.length - 1];
    if (last?.triad && last.triad.root === entry.triad.root && last.triad.quality === entry.triad.quality) continue;
    out.push(entry);
  }
  return out;
}

/** Les accords saisis, en chiffrage Nashville — la forme où un chant les garde. */
export function toBars(chords: EnteredChord[], key: number, mode: Mode = 'major'): string[] {
  return chords.flatMap(({ root, chord }) => {
    const bar = chordToNashville({ root, chord, bass: null }, key, mode);
    return nashvilleToChord(bar, key, mode) ? [bar] : [];
  });
}

/** Un chant enregistré à partir d'accords saisis. */
export function songFromChords(title: string, key: number, chords: EnteredChord[], id?: string): Song {
  return {
    id: id ?? newId('song'),
    title: title.trim(),
    defaultKey: key,
    mode: 'major',
    sections: [{ name: 'verse', bars: toBars(chords, key) }],
    source: 'manual',
    updatedAt: new Date().toISOString(),
  };
}

/** Les accords d'un chant, dans sa tonalité habituelle. */
export const chordsOfSong = (song: Song): EnteredChord[] =>
  songChords(song).map(({ root, chord }) => ({ root, chord }));
