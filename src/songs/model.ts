/**
 * Les chants et les sets. Des données plates et des fonctions pures.
 *
 * Un chant ne retient pas d'accords écrits en clair mais une grille en chiffrage
 * Nashville : « 1 5 6m 4 » ne change pas quand la tonalité change. C'est ce qui
 * permet à un même chant d'être joué en Ré un dimanche et en Sol le suivant, et de
 * partager un set sans partager de paroles.
 *
 * Les paroles, elles, ne sont gardées que sur l'appareil : elles vivent dans un
 * champ à part, et rien de ce qui sort de l'app — un lien, un QR code, un set
 * envoyé à l'équipe — ne les emporte.
 */
import { ChordId } from '../theory/chords';
import { Mode, NashvilleChord, nashvilleToChord } from '../theory/nashville';

/** Les noms de sections que l'app propose ; un nom libre reste possible. */
export const SECTION_NAMES = ['intro', 'verse', 'chorus', 'bridge', 'tag', 'outro'] as const;
export type SectionName = (typeof SECTION_NAMES)[number] | string;

export interface Section {
  name: SectionName;
  /** Les mesures, en chiffrage Nashville : `1`, `5/7`, `2m7`. */
  bars: string[];
}

/** D'où vient le chant. `gcc` est réservé à la future liaison de la plateforme. */
export type SongSource = 'manual' | 'chordpro' | 'shared' | 'gcc';

export interface Song {
  id: string;
  title: string;
  /** Classe de hauteur 0-11 : la tonalité habituelle du chant. */
  defaultKey: number;
  mode: Mode;
  /** Absent quand on ne connaît que la tonalité : « Tonalité seulement ». */
  sections?: Section[];
  tempo?: number;
  /** Consignes, dynamique : « doux au deuxième couplet ». */
  notes?: string;
  /** Le capo noté à la saisie des accords. Les triades ne le prennent pas en compte. */
  capo?: number;
  referenceUrl?: string;
  source: SongSource;
  /** ISO, pour que la synchronisation sache quoi gagner. */
  updatedAt: string;
  /**
   * Les paroles, quand une grille ChordPro en contenait.
   *
   * Locales par construction : `forSharing` les retire avant tout partage.
   */
  lyrics?: string;
}

/** Un chant dans un set : la tonalité et le capo du jour, et son rang. */
export interface SetSong {
  songId: string;
  key: number;
  capo: number;
  order: number;
}

export interface WorshipSet {
  id: string;
  date: string;
  /**
   * ISO, comme pour un chant : c'est ce qui décide qui gagne quand le téléphone
   * et le compte ont chacun modifié le même set.
   */
  updatedAt?: string;
  /** Le nom du culte, facultatif : « Culte du soir ». */
  serviceName?: string;
  songs: SetSong[];
  /** Id du SetSource d'origine ; `manual` pour un set écrit à la main. */
  source: string;
  /**
   * Le prénom de qui l'a envoyé, pour un set reçu.
   *
   * Gardé à part du nom du culte : « Reçu de Christelle » est ce qu'on veut lire
   * sur l'accueil, et l'écrire dans `serviceName` le ferait passer pour le nom du
   * culte partout ailleurs.
   */
  from?: string;
}

export const MANUAL_SOURCE = 'manual';

let counter = 0;

/**
 * Un id local. Pas un uuid, et il ne prétend pas l'être : il doit seulement être
 * unique parmi les chants de ce téléphone. Un id synchronisé viendrait de la source.
 */
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

export const today = (now = new Date()) => now.toISOString().slice(0, 10);

/**
 * Le prochain dimanche, qui est le jour où un set est joué. Aujourd'hui compte
 * comme le prochain dimanche quand on est dimanche : un set créé le jour même est
 * daté de ce jour.
 */
export function nextSunday(now = new Date()): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + ((7 - date.getUTCDay()) % 7));
  return date.toISOString().slice(0, 10);
}

/**
 * Les prochains dimanches, le premier étant celui qui vient.
 *
 * Un set se date presque toujours un dimanche : les proposer évite d'écrire une
 * date à la main, et c'est aussi ce qui permet de choisir « dimanche prochain »
 * plutôt que « dans trois semaines » sans compter.
 */
export function nextSundays(count: number, now = new Date()): string[] {
  const first = new Date(`${nextSunday(now)}T00:00:00.000Z`);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(first);
    date.setUTCDate(first.getUTCDate() + index * 7);
    return date.toISOString().slice(0, 10);
  });
}

/** Un chant réduit à sa tonalité, sans grille, à remplir plus tard. */
export function emptySong(title: string, defaultKey: number, mode: Mode = 'major', source: SongSource = 'manual'): Song {
  return { id: newId('song'), title, defaultKey, mode, source, updatedAt: new Date().toISOString() };
}

/** Les mesures d'une grille, en accords. Une mesure illisible est sautée. */
export function barsToChords(bars: string[], key: number, mode: Mode): NashvilleChord[] {
  return bars.flatMap((bar) => {
    const chord = nashvilleToChord(bar, key, mode);
    return chord ? [chord] : [];
  });
}

/**
 * La grille d'un chant, section après section, dans sa tonalité habituelle.
 *
 * Un chant sans grille n'a pas d'accords : la fiche affiche alors les accords
 * probables de la tonalité plutôt qu'une grille vide.
 */
export function songChords(song: Song, key = song.defaultKey): { root: number; chord: ChordId }[] {
  const sections = song.sections ?? [];
  return sections
    .flatMap((section) => barsToChords(section.bars, key, song.mode))
    .map(({ root, chord }) => ({ root, chord }));
}

/** Les chants d'un set, dans l'ordre, avec leur tonalité et leur capo du jour. */
export function setSongs(set: WorshipSet, songs: Song[]): { song: Song; entry: SetSong }[] {
  const byId = new Map(songs.map((s) => [s.id, s]));
  return [...set.songs]
    .sort((a, b) => a.order - b.order)
    .flatMap((entry) => {
      const song = byId.get(entry.songId);
      return song ? [{ song, entry }] : [];
    });
}

/**
 * Tous les accords du set, dans l'ordre, une mesure par accord.
 *
 * Chaque chant est lu dans la tonalité du set, pas dans la sienne : c'est celle
 * qu'on jouera dimanche, et c'est donc celle qu'il faut travailler.
 */
export function setChords(set: WorshipSet, songs: Song[]): { root: number; chord: ChordId }[] {
  return setSongs(set, songs).flatMap(({ song, entry }) => songChords(song, entry.key));
}
