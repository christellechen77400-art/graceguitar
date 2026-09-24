/**
 * La bibliothèque de chants et de sets, et sa persistance.
 *
 * Tout passe par le même endroit : une écriture qui n'est pas enregistrée est un
 * bug qu'on ne voit qu'au redémarrage, donc chaque mutation écrit avant de rendre
 * son état.
 *
 * Au premier lancement du lot 3, la clé du lot 2 est lue, convertie, écrite sous
 * la nouvelle clé, puis effacée. La conversion est dans `migrate.ts`, où elle est
 * testée ; ici on ne fait que l'enchaîner.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ensureMigrated, STORAGE_KEYS } from '../state/storage';
import { Library, migrateLibrary } from './migrate';
import {
  MANUAL_SOURCE,
  newId,
  nextSunday,
  Song,
  SetSong,
  WorshipSet,
} from './model';

const STORAGE_KEY = STORAGE_KEYS.library;
const LEGACY_KEY = STORAGE_KEYS.songs;

const EMPTY: Library = { songs: [], sets: [] };

interface Ctx extends Library {
  /** Ajoute un chant déjà construit (import, saisie éclair, grille). */
  addSong: (song: Song) => void;
  updateSong: (id: string, patch: Partial<Omit<Song, 'id'>>) => void;
  removeSong: (id: string) => void;
  createSet: (date?: string, serviceName?: string) => WorshipSet;
  updateSet: (id: string, patch: Partial<Omit<WorshipSet, 'id' | 'songs'>>) => void;
  removeSet: (id: string) => void;
  /** Ajoute un chant au set, à la fin, dans sa tonalité habituelle. */
  addToSet: (setId: string, songId: string) => void;
  removeFromSet: (setId: string, songId: string) => void;
  /** Déplace un chant d'un rang, ou ne fait rien s'il sort du set. */
  moveInSet: (setId: string, songId: string, delta: number) => void;
  /** Change la tonalité ou le capo d'un chant dans un set donné. */
  updateInSet: (setId: string, songId: string, patch: Partial<Pick<SetSong, 'key' | 'capo'>>) => void;
}

const SongsContext = createContext<Ctx | null>(null);

/**
 * Un blob enregistré, ramené à la forme attendue.
 *
 * Chaque tableau est filtré : un blob à moitié écrit ne doit pas poser un chant
 * sans titre dans la liste. Les entrées de set sont triées par rang ici, une fois
 * pour toutes, pour que le reste du code n'ait jamais à s'en soucier.
 */
function hydrate(raw: string): Library {
  const stored = JSON.parse(raw) as Partial<Library>;
  const songs = (stored.songs ?? []).filter(
    (s) => s && typeof s.id === 'string' && typeof s.title === 'string' && typeof s.defaultKey === 'number',
  );
  const ids = new Set(songs.map((s) => s.id));
  const sets = (stored.sets ?? [])
    .filter((s) => s && typeof s.id === 'string' && Array.isArray(s.songs))
    .map((s) => ({
      ...s,
      songs: [...s.songs]
        .filter((entry) => entry && typeof entry.songId === 'string' && ids.has(entry.songId))
        .sort((a, b) => a.order - b.order)
        .map((entry, order) => ({ ...entry, order })),
    }));
  return { songs, sets };
}

/** Le blob du lot 2, converti en bibliothèque du lot 3. */
async function loadLegacy(): Promise<Library | null> {
  const raw = await AsyncStorage.getItem(LEGACY_KEY);
  if (!raw) return null;
  const library = migrateLibrary(JSON.parse(raw));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  // The old key goes only once the new one is written: a crash in between must
  // not leave the library readable by neither version.
  await AsyncStorage.removeItem(LEGACY_KEY);
  return library;
}

export function SongsProvider({ children }: { children: React.ReactNode }) {
  const [library, setLibrary] = useState<Library>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    ensureMigrated()
      .then(() => AsyncStorage.getItem(STORAGE_KEY))
      .then(async (raw) => (raw ? hydrate(raw) : loadLegacy()))
      .then((loaded) => {
        if (!cancelled && loaded) setLibrary(loaded);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<Ctx>(() => {
    // Every write goes through here, so persistence can never be forgotten.
    const save = (next: Library) => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    };
    /** Applique un changement aux chants d'un set, en gardant les rangs serrés. */
    const patchSongs = (sets: WorshipSet[], setId: string, change: (songs: SetSong[]) => SetSong[]) =>
      sets.map((s) => (s.id === setId ? { ...s, songs: renumber(change(s.songs)) } : s));

    return {
      ...library,
      addSong: (song) => setLibrary((prev) => save({ ...prev, songs: [...prev.songs, song] })),
      updateSong: (id, patch) =>
        setLibrary((prev) =>
          save({
            ...prev,
            songs: prev.songs.map((s) =>
              s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s,
            ),
          }),
        ),
      removeSong: (id) =>
        setLibrary((prev) =>
          save({
            songs: prev.songs.filter((s) => s.id !== id),
            // A deleted song leaves every set: keeping the id would show a hole.
            sets: prev.sets.map((s) => ({ ...s, songs: renumber(s.songs.filter((e) => e.songId !== id)) })),
          }),
        ),
      createSet: (date, serviceName) => {
        const set: WorshipSet = {
          id: newId('set'),
          date: date ?? nextSunday(),
          serviceName: serviceName?.trim() || undefined,
          source: MANUAL_SOURCE,
          songs: [],
        };
        setLibrary((prev) => save({ ...prev, sets: [...prev.sets, set] }));
        return set;
      },
      updateSet: (id, patch) =>
        setLibrary((prev) =>
          save({ ...prev, sets: prev.sets.map((s) => (s.id === id ? { ...s, ...patch } : s)) }),
        ),
      removeSet: (id) =>
        setLibrary((prev) => save({ ...prev, sets: prev.sets.filter((s) => s.id !== id) })),
      addToSet: (setId, songId) =>
        setLibrary((prev) => {
          const song = prev.songs.find((s) => s.id === songId);
          if (!song) return prev;
          return save({
            ...prev,
            sets: patchSongs(prev.sets, setId, (songs) => {
              // Already in the set: adding it again would give the same song two
              // rows, which no worship leader wants.
              if (songs.some((e) => e.songId === songId)) return songs;
              return [
                ...songs,
                { songId, key: song.defaultKey, capo: 0, order: songs.length },
              ];
            }),
          });
        }),
      removeFromSet: (setId, songId) =>
        setLibrary((prev) =>
          save({
            ...prev,
            sets: patchSongs(prev.sets, setId, (songs) => songs.filter((e) => e.songId !== songId)),
          }),
        ),
      moveInSet: (setId, songId, delta) =>
        setLibrary((prev) =>
          save({
            ...prev,
            sets: patchSongs(prev.sets, setId, (songs) => {
              const from = songs.findIndex((e) => e.songId === songId);
              const to = from + delta;
              if (from < 0 || to < 0 || to >= songs.length) return songs;
              const moved = [...songs];
              [moved[from], moved[to]] = [moved[to], moved[from]];
              return moved;
            }),
          }),
        ),
      updateInSet: (setId, songId, patch) =>
        setLibrary((prev) =>
          save({
            ...prev,
            sets: patchSongs(prev.sets, setId, (songs) =>
              songs.map((e) => (e.songId === songId ? { ...e, ...patch } : e)),
            ),
          }),
        ),
    };
  }, [library]);

  return <SongsContext.Provider value={value}>{children}</SongsContext.Provider>;
}

/**
 * Les rangs remis à zéro.
 *
 * Le rang est l'ordre de jeu ; après un retrait ou un déplacement, il doit rester
 * 0, 1, 2 sans trou, sinon « monter » finirait par ne plus rien faire.
 */
function renumber(songs: SetSong[]): SetSong[] {
  return [...songs].sort((a, b) => a.order - b.order).map((entry, order) => ({ ...entry, order }));
}

export function useSongs() {
  const ctx = useContext(SongsContext);
  if (!ctx) throw new Error('useSongs must be used inside SongsProvider');
  return ctx;
}
