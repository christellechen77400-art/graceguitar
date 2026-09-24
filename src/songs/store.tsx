import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ensureMigrated, STORAGE_KEYS } from '../state/storage';
import { MANUAL_SOURCE, newId, nextSunday, Song, songFromChordPro, SongSet } from './model';

const STORAGE_KEY = STORAGE_KEYS.songs;

interface Library {
  songs: Song[];
  sets: SongSet[];
}

const EMPTY: Library = { songs: [], sets: [] };

interface Ctx extends Library {
  /** Adds a chart. `title` is only a fallback for a file that names itself. */
  addFromChordPro: (text: string, fallbackTitle: string) => Song;
  addSong: (song: Song) => void;
  updateSong: (id: string, patch: Partial<Song>) => void;
  removeSong: (id: string) => void;
  createSet: (title: string, date?: string) => SongSet;
  updateSet: (id: string, patch: Partial<SongSet>) => void;
  removeSet: (id: string) => void;
  /** Adds a song to a set, or moves it if it is already there. */
  addToSet: (setId: string, songId: string) => void;
  removeFromSet: (setId: string, songId: string) => void;
  moveInSet: (setId: string, songId: string, delta: number) => void;
}

const SongsContext = createContext<Ctx | null>(null);

/**
 * A stored blob merged over the empty library.
 *
 * Only the two arrays are read, and each is filtered to the shape we expect: a
 * half-written blob must not put an undefined song into the list.
 */
function hydrate(raw: string): Library {
  const stored = JSON.parse(raw) as Partial<Library>;
  return {
    songs: (stored.songs ?? []).filter((s) => s && typeof s.id === 'string' && typeof s.title === 'string'),
    sets: (stored.sets ?? []).filter((s) => s && typeof s.id === 'string' && Array.isArray(s.songIds)),
  };
}

export function SongsProvider({ children }: { children: React.ReactNode }) {
  const [library, setLibrary] = useState<Library>(EMPTY);

  useEffect(() => {
    ensureMigrated()
      .then(() => AsyncStorage.getItem(STORAGE_KEY))
      .then((raw) => {
        if (raw) setLibrary(hydrate(raw));
      })
      .catch(() => {});
  }, []);

  const value = useMemo<Ctx>(() => {
    // Every write goes through here, so persistence can never be forgotten.
    const save = (next: Library) => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    };
    const patchSet = (id: string, patch: Partial<SongSet>) =>
      setLibrary((prev) =>
        save({ ...prev, sets: prev.sets.map((s) => (s.id === id ? { ...s, ...patch } : s)) }),
      );

    return {
      ...library,
      addFromChordPro: (text, fallbackTitle) => {
        const song = songFromChordPro(text, fallbackTitle);
        setLibrary((prev) => save({ ...prev, songs: [...prev.songs, song] }));
        return song;
      },
      addSong: (song) => setLibrary((prev) => save({ ...prev, songs: [...prev.songs, song] })),
      updateSong: (id, patch) =>
        setLibrary((prev) =>
          save({ ...prev, songs: prev.songs.map((s) => (s.id === id ? { ...s, ...patch } : s)) }),
        ),
      removeSong: (id) =>
        setLibrary((prev) =>
          save({
            songs: prev.songs.filter((s) => s.id !== id),
            // A deleted song leaves every set: keeping the id would show a hole.
            sets: prev.sets.map((s) => ({ ...s, songIds: s.songIds.filter((x) => x !== id) })),
          }),
        ),
      createSet: (title, date) => {
        const set: SongSet = {
          id: newId('set'),
          title,
          date: date ?? nextSunday(),
          songIds: [],
          source: MANUAL_SOURCE,
        };
        setLibrary((prev) => save({ ...prev, sets: [...prev.sets, set] }));
        return set;
      },
      updateSet: patchSet,
      removeSet: (id) => setLibrary((prev) => save({ ...prev, sets: prev.sets.filter((s) => s.id !== id) })),
      addToSet: (setId, songId) =>
        setLibrary((prev) =>
          save({
            ...prev,
            sets: prev.sets.map((s) =>
              s.id === setId && !s.songIds.includes(songId) ? { ...s, songIds: [...s.songIds, songId] } : s,
            ),
          }),
        ),
      removeFromSet: (setId, songId) =>
        setLibrary((prev) =>
          save({
            ...prev,
            sets: prev.sets.map((s) =>
              s.id === setId ? { ...s, songIds: s.songIds.filter((x) => x !== songId) } : s,
            ),
          }),
        ),
      moveInSet: (setId, songId, delta) =>
        setLibrary((prev) =>
          save({
            ...prev,
            sets: prev.sets.map((s) => {
              if (s.id !== setId) return s;
              const from = s.songIds.indexOf(songId);
              const to = from + delta;
              if (from < 0 || to < 0 || to >= s.songIds.length) return s;
              const ids = [...s.songIds];
              ids[from] = ids[to];
              ids[to] = songId;
              return { ...s, songIds: ids };
            }),
          }),
        ),
    };
  }, [library]);

  return <SongsContext.Provider value={value}>{children}</SongsContext.Provider>;
}

export function useSongs() {
  const ctx = useContext(SongsContext);
  if (!ctx) throw new Error('useSongs must be used inside SongsProvider');
  return ctx;
}
