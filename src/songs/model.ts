/**
 * Songs and the sets they are played in. Plain data and pure helpers.
 *
 * A song keeps its ChordPro source verbatim: the parsed form is derived on demand,
 * so an edit to the parser improves every song already stored, and nothing has to
 * be migrated when the parser learns a new directive.
 */
import { ChordId, parseNoteName } from '../theory/chords';
import { inferKey, ParsedSong, parseChordPro, progression } from '../theory/chordpro';

export interface Song {
  id: string;
  title: string;
  artist: string;
  /** Pitch class of the key, or null when neither the file nor the reader said. */
  key: number | null;
  capo: number | null;
  /** The ChordPro source, as typed or imported. */
  chordPro: string;
}

export interface SongSet {
  id: string;
  title: string;
  /** Service date, as YYYY-MM-DD. */
  date: string;
  songIds: string[];
  /** Id of the SetSource it came from; `manual` for a hand-written set. */
  source: string;
}

export const MANUAL_SOURCE = 'manual';

let counter = 0;

/**
 * A local id. Not a uuid and not pretending to be one: it only has to be unique
 * among the songs on this phone, and a synced id would come from the source.
 */
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

export const parseSong = (song: Song): ParsedSong => parseChordPro(song.chordPro);

/** The chords a song uses, one per change, with the key it is played in. */
export function songChords(song: Song): { root: number; chord: ChordId }[] {
  return progression(parseSong(song));
}

/**
 * The key a song is in: what it declares, else what the reader typed, else what the
 * chords suggest. Reading it off the chords is the whole point — most ChordPro
 * files in the wild carry no `{key}` at all.
 */
export function songKey(song: Song): number | null {
  if (song.key !== null) return song.key;
  const parsed = parseSong(song);
  const declared = parsed.key ? parseNoteName(parsed.key) : null;
  return declared ?? inferKey(parsed);
}

/** Builds a song from ChordPro text, taking what the file says about itself. */
export function songFromChordPro(text: string, fallbackTitle: string): Song {
  const parsed = parseChordPro(text);
  return {
    id: newId('song'),
    title: parsed.title?.trim() || fallbackTitle,
    artist: parsed.artist?.trim() ?? '',
    key: parsed.key ? parseNoteName(parsed.key) : null,
    capo: parsed.capo,
    chordPro: text,
  };
}

/** A song with no chart: a title typed in, to be filled out later. */
export function emptySong(title: string): Song {
  return { id: newId('song'), title, artist: '', key: null, capo: null, chordPro: '' };
}

/** The songs of a set, in playing order, skipping ones that have been deleted. */
export function setSongs(set: SongSet, songs: Song[]): Song[] {
  const byId = new Map(songs.map((s) => [s.id, s]));
  return set.songIds.flatMap((id) => {
    const song = byId.get(id);
    return song ? [song] : [];
  });
}

/** Every chord of the set, in order, chord changes only. */
export function setChords(set: SongSet, songs: Song[]): { root: number; chord: ChordId }[] {
  return setSongs(set, songs).flatMap(songChords);
}

export const today = (now = new Date()) => now.toISOString().slice(0, 10);

/**
 * The next Sunday, which is when a worship set is played. Today counts as the next
 * Sunday when today is Sunday, so a set created on the day is dated that day.
 */
export function nextSunday(now = new Date()): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + ((7 - date.getUTCDay()) % 7));
  return date.toISOString().slice(0, 10);
}
