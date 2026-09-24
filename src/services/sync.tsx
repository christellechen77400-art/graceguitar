/**
 * L'échange avec le compte.
 *
 * Une seule règle : **rien ne se perd**. Ce qui est sur le téléphone et ce qui est
 * dans le compte sont réunis, jamais remplacés l'un par l'autre, et l'échange peut
 * être refait autant de fois qu'on veut sans rien compter deux fois — les
 * identifiants des réponses sont fabriqués à partir de la séance, donc rejouer le
 * même envoi écrit les mêmes lignes.
 *
 * L'échange ne lève jamais. Sans réseau, il ne se passe rien, l'app continue, et le
 * prochain passage fera le travail. Un carnet qui refuse de s'ouvrir parce que le
 * serveur est loin serait pire que pas de compte du tout.
 *
 * L'ordre est toujours le même — tirer, fusionner, pousser — pour que ce qui part
 * soit exactement ce que les deux côtés viennent de se mettre d'accord d'avoir.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Library } from '../songs/migrate';
import { useSongs } from '../songs/store';
import { useSettings } from '../state/settings';
import { useAuth } from './auth';
import { AuthErrorKey, authErrorKey } from './authErrors';
import {
  EventRow,
  ProfileRow,
  SetRow,
  SetSongRow,
  SongRow,
  eventRow,
  profileRow,
  rowToEvent,
  rowToSet,
  rowToSong,
  setRow,
  setSongRow,
  settingsFromProfile,
  songRow,
} from './cloudRows';
import {
  ProgressEvent,
  daysFromEvents,
  mergeLibrary,
  rebaseProgress,
  rememberEvents,
  unionDays,
  unionEvents,
} from './merge';
import { supabase } from './supabase';

/** Le temps qu'on laisse passer après une écriture avant d'envoyer. */
const DEBOUNCE_MS = 2500;

interface Ctx {
  /** Vrai quand l'échange est configuré : un compte existe et Supabase est là. */
  available: boolean;
  syncing: boolean;
  /** L'instant du dernier échange réussi, ou `null`. */
  lastSync: string | null;
  /** Ce qui a empêché le dernier échange, ou `null`. */
  error: AuthErrorKey | null;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<Ctx | null>(null);

/**
 * L'empreinte de ce qu'on a sous la main.
 *
 * Sert à ne pas renvoyer au compte ce qu'on vient d'en recevoir : après un
 * échange, l'empreinte locale est celle qu'on a poussée, et la boucle s'arrête.
 * Les dates suffisent — chaque écriture en pose une — et le nombre de réponses
 * attrape le reste.
 */
function signature(library: Library, events: readonly ProgressEvent[], cells: number): string {
  const stamps = [
    ...library.songs.map((song) => `${song.id}@${song.updatedAt}`),
    ...library.sets.map((set) => `${set.id}@${set.updatedAt ?? ''}`),
  ].join('|');
  return `${stamps}#${events.length}#${cells}`;
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { account } = useAuth();
  const { settings, update } = useSettings();
  const { songs, sets, adoptLibrary } = useSongs();

  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [error, setError] = useState<AuthErrorKey | null>(null);

  /**
   * L'état courant, lu au moment de l'échange.
   *
   * L'échange dure plusieurs allers-retours ; s'il lisait les valeurs capturées au
   * moment où il a commencé, il enverrait une version déjà périmée.
   */
  const live = useRef({ settings, songs, sets, update, adoptLibrary });
  live.current = { settings, songs, sets, update, adoptLibrary };

  const busy = useRef(false);
  const pushed = useRef<string | null>(null);
  /** Les réponses déjà montées : inutile de les renvoyer à chaque passage. */
  const sent = useRef(new Set<string>());

  const client = supabase;
  const userId = account?.id ?? null;
  const available = Boolean(client && userId);

  const syncNow = useCallback(async () => {
    if (!client || !userId || busy.current) return;
    busy.current = true;
    setSyncing(true);
    try {
      const { settings: now, songs: localSongs, sets: localSets, update: write } = live.current;
      const local: Library = { songs: localSongs, sets: localSets };

      // ---- Tirer -------------------------------------------------------
      const [profile, songRows, setRows, setSongRows, eventRows] = await Promise.all([
        client.from('profiles').select('*').eq('id', userId).maybeSingle(),
        client.from('songs').select('*').eq('user_id', userId),
        client.from('sets').select('*').eq('user_id', userId),
        client.from('set_songs').select('*'),
        client.from('progress_events').select('*').eq('user_id', userId),
      ]);
      // La première erreur arrête tout : mieux vaut ne rien faire qu'une moitié.
      const failure = [profile, songRows, setRows, setSongRows, eventRows].find((r) => r.error);
      if (failure?.error) throw failure.error;

      const entries = ((setSongRows.data ?? []) as unknown as SetSongRow[]).reduce<
        Record<string, SetSongRow[]>
      >((bySet, row) => {
        (bySet[row.set_id] ??= []).push(row);
        return bySet;
      }, {});
      // Les paroles ne voyagent pas : celles du téléphone restent, et une absence
      // en face n'efface rien.
      const lyrics = new Map(localSongs.map((song) => [song.id, song.lyrics]));
      const remote: Library = {
        songs: ((songRows.data ?? []) as unknown as SongRow[]).map((row) =>
          rowToSong(row, lyrics.get(row.id)),
        ),
        sets: ((setRows.data ?? []) as unknown as SetRow[]).map((row) =>
          rowToSet(row, entries[row.id] ?? []),
        ),
      };
      const events = ((eventRows.data ?? []) as unknown as EventRow[]).map(rowToEvent);

      // ---- Fusionner ---------------------------------------------------
      const merged = mergeLibrary(local, remote);
      const journal = unionEvents(now.events, events);
      adoptLibrary(remote);
      write({
        ...settingsFromProfile((profile.data ?? {}) as Partial<ProfileRow>),
        progress: rebaseProgress(now.progress, now.events, events),
        practiceDays: unionDays(now.practiceDays, daysFromEvents(events)),
        events: rememberEvents([], journal),
      });

      // ---- Pousser -----------------------------------------------------
      const at = new Date();
      await client
        .from('profiles')
        .upsert(profileRow(userId, now, at), { onConflict: 'id' });
      if (merged.songs.length) {
        await client.from('songs').upsert(merged.songs.map((song) => songRow(song, userId)), {
          onConflict: 'id',
        });
      }
      if (merged.sets.length) {
        await client.from('sets').upsert(merged.sets.map((set) => setRow(set, userId, at)), {
          onConflict: 'id',
        });
        const ids = merged.sets.map((set) => set.id);
        const rows = merged.sets.flatMap((set) => set.songs.map((entry) => setSongRow(set.id, entry)));
        // On écrit d'abord les places, on retire ensuite celles qui ne sont plus
        // là : dans l'autre ordre, une coupure en cours laisserait un set vide.
        if (rows.length) {
          await client.from('set_songs').upsert(rows, { onConflict: 'id' });
        }
        const { data: existing } = await client.from('set_songs').select('id').in('set_id', ids);
        const keep = new Set(rows.map((row) => row.id));
        const gone = ((existing ?? []) as { id: string }[])
          .map((row) => row.id)
          .filter((id) => !keep.has(id));
        if (gone.length) await client.from('set_songs').delete().in('id', gone);
      }
      // Les réponses ne se remplacent pas : elles s'ajoutent. Une ligne déjà
      // connue du serveur est ignorée, donc un renvoi ne compte pas deux fois.
      const fresh = journal.filter((event) => !sent.current.has(event.id));
      if (fresh.length) {
        await client
          .from('progress_events')
          .upsert(fresh.map((event) => eventRow(event, userId)), {
            onConflict: 'id',
            ignoreDuplicates: true,
          });
      }
      for (const event of fresh) sent.current.add(event.id);

      // L'empreinte est posée après coup : l'état local va devenir ce qu'on vient
      // d'envoyer, et cette écriture ne doit pas déclencher un second envoi.
      pushed.current = signature(merged, journal, Object.keys(now.progress).length);
      setLastSync(at.toISOString());
      setError(null);
    } catch (cause) {
      setError(authErrorKey(cause));
    } finally {
      busy.current = false;
      setSyncing(false);
    }
  }, [client, userId, adoptLibrary]);

  // À la connexion : un premier échange, qui ramène ce qui existe déjà.
  useEffect(() => {
    if (available) void syncNow();
  }, [available, syncNow]);

  // Au retour dans l'app : c'est là que le compte a pu changer ailleurs.
  useEffect(() => {
    if (!available) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncNow();
    });
    return () => sub.remove();
  }, [available, syncNow]);

  // Après une écriture locale, une fois qu'elle s'est calmée. L'empreinte évite
  // de renvoyer ce qu'on vient de recevoir.
  const cells = Object.keys(settings.progress).length;
  useEffect(() => {
    if (!available) return;
    const current = signature({ songs, sets }, settings.events, cells);
    if (current === pushed.current) return;
    const timer = setTimeout(() => void syncNow(), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [available, songs, sets, settings.events, cells, syncNow]);

  const value = useMemo<Ctx>(
    () => ({ available, syncing, lastSync, error, syncNow }),
    [available, syncing, lastSync, error, syncNow],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside SyncProvider');
  return ctx;
}
