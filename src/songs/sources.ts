/**
 * Where a set can come from, besides typing it in.
 *
 * Only the shape is here, deliberately: the plan is to read the worship team's
 * planning from GCC Louange first, then from Planning Center, and neither is
 * wired up. Defining the interface now means the set screen is written once —
 * against `SetSource` — and adding a real one is a new entry in this list rather
 * than a change to the screen.
 *
 * Every source returns the same thing: a set, with its songs, already in ChordPro.
 * Translating whatever the service actually returns into ChordPro belongs inside
 * the source, so the app only ever has one song format to understand.
 */

export interface ExternalSong {
  title: string;
  artist?: string;
  /** Pitch class, when the source knows the key. */
  key?: number | null;
  capo?: number | null;
  /** The chart, in ChordPro. A song with no chart is still a song. */
  chordPro?: string;
}

export interface ExternalSet {
  /** Id at the source. Stored alongside the source id, so it stays unique locally. */
  id: string;
  title: string;
  /** Service date, as YYYY-MM-DD. */
  date: string;
  songs: ExternalSong[];
}

/** The sources the app knows about. Named, so the i18n lookup stays type-checked. */
export type SetSourceId = 'manual' | 'gcc' | 'planningCenter';

export interface SetSource {
  id: SetSourceId;
  /**
   * Whether this source can be used right now. False for the ones that are only
   * planned: the screen shows them greyed out rather than hiding them, so it is
   * clear the app intends to read them.
   */
  available: boolean;
  /** The sets this source has for the team, newest first. */
  fetchSets(): Promise<ExternalSet[]>;
}

/** Thrown by a source that has not been built yet. Never a silent empty list. */
function notBuilt(name: string): () => Promise<never> {
  return () => Promise.reject(new Error(`${name} is not wired up yet`));
}

export const SET_SOURCES: SetSource[] = [
  {
    id: 'manual',
    available: true,
    // A hand-written set lives in the app, so there is nothing to fetch.
    fetchSets: async () => [],
  },
  {
    id: 'gcc',
    available: false,
    fetchSets: notBuilt('GCC Louange'),
  },
  {
    id: 'planningCenter',
    available: false,
    fetchSets: notBuilt('Planning Center'),
  },
];

export const sourceById = (id: SetSourceId) => SET_SOURCES.find((s) => s.id === id) ?? SET_SOURCES[0];
