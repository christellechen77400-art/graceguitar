/**
 * Le passage du lot 2 au lot 3, pour les chants déjà enregistrés.
 *
 * Un chant du lot 2 gardait son texte ChordPro tel quel et une liste d'ids dans
 * chaque set. Le lot 3 garde une grille en chiffrage Nashville et, dans le set,
 * la tonalité et le capo du jour. La conversion est pure : on lit un blob, on en
 * rend un autre, et on peut la tester sans téléphone.
 *
 * Elle est tolérante par principe — un blob à moitié écrit ne doit pas faire
 * disparaître la bibliothèque — et elle ne perd jamais un chant : ce qu'elle ne
 * sait pas lire, elle le garde tel quel.
 */
import { parseNoteName } from '../theory/chords';
import { Mode } from '../theory/nashville';
import { inferKey, inferMode, parseChordPro, sectionBars } from './chordpro';
import { MANUAL_SOURCE, Song, SongSource, WorshipSet } from './model';

/** La forme enregistrée par le lot 2. */
interface LegacySong {
  id: string;
  title: string;
  artist?: string;
  key?: number | null;
  capo?: number | null;
  chordPro?: string;
}

interface LegacySet {
  id: string;
  title?: string;
  date?: string;
  songIds?: string[];
  source?: string;
}

export interface Library {
  songs: Song[];
  sets: WorshipSet[];
}

const SOURCES: SongSource[] = ['manual', 'chordpro', 'shared', 'gcc'];
const asSource = (value: unknown): SongSource =>
  SOURCES.includes(value as SongSource) ? (value as SongSource) : 'manual';

/**
 * Un chant du lot 3 lu depuis un chant du lot 2.
 *
 * La tonalité déclarée gagne, puis celle que les accords suggèrent, puis do : un
 * chant sans aucune information doit quand même s'ouvrir sur quelque chose de
 * jouable plutôt que sur une erreur.
 */
export function songFromLegacy(raw: LegacySong): Song {
  const chart = typeof raw.chordPro === 'string' ? raw.chordPro : '';
  const parsed = parseChordPro(chart);
  const declared = parsed.key ? parseNoteName(parsed.key) : null;
  const key = typeof raw.key === 'number' ? raw.key : declared ?? inferKey(parsed) ?? 0;
  const mode: Mode = inferMode(parsed, key);

  const sections = parsed.sections
    .map((section) => ({ name: section.label ?? 'verse', bars: sectionBars(section, key, mode) }))
    .filter((section) => section.bars.length > 0);

  // A song typed in by hand with no chart at all is still a song: it keeps its
  // key and shows as "key only", which is what the sheet is for.
  return {
    id: raw.id,
    title: raw.title,
    defaultKey: key,
    mode,
    sections: sections.length ? sections : undefined,
    tempo: parsed.tempo ?? undefined,
    source: chart ? 'chordpro' : 'manual',
    // The old blob carried no date, and inventing one would make the sync think
    // this song changed today. The epoch says "older than anything else".
    updatedAt: new Date(0).toISOString(),
  };
}

/**
 * La bibliothèque du lot 3 lue depuis le blob du lot 2.
 *
 * Les chants d'abord, pour que les sets puissent s'y référer : un set dont le
 * chant a disparu perd son entrée, comme il le ferait à l'usage.
 */
export function migrateLibrary(raw: unknown): Library {
  const stored = (raw ?? {}) as { songs?: unknown; sets?: unknown };
  const rawSongs = Array.isArray(stored.songs) ? (stored.songs as LegacySong[]) : [];
  const rawSets = Array.isArray(stored.sets) ? (stored.sets as LegacySet[]) : [];

  const valid = rawSongs.filter(
    (s) => s && typeof s.id === 'string' && typeof s.title === 'string',
  );
  const songs = valid.map(songFromLegacy);

  const byId = new Map(songs.map((s) => [s.id, s]));
  // The capo used to live on the song. It belongs to the set in the new model —
  // a song can be capoed differently from one Sunday to the next — so it moves
  // here rather than being dropped.
  const legacyCapo = new Map(
    valid.map((s) => [s.id, typeof s.capo === 'number' ? s.capo : null] as const),
  );

  const sets: WorshipSet[] = rawSets
    .filter((s) => s && typeof s.id === 'string' && Array.isArray(s.songIds))
    .map((s) => ({
      id: s.id,
      date: typeof s.date === 'string' && s.date ? s.date : new Date().toISOString().slice(0, 10),
      serviceName: s.title?.trim() || undefined,
      source: s.source ?? MANUAL_SOURCE,
      // The order is the one the songs were listed in: that is the playing order
      // the set already had.
      songs: (s.songIds ?? []).flatMap((songId, order) => {
        const song = byId.get(songId);
        return song ? [{ songId, key: song.defaultKey, capo: legacyCapo.get(songId) ?? 0, order }] : [];
      }),
    }));

  return { songs, sets };
}
