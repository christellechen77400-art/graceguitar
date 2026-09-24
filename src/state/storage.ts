/**
 * Where the app keeps things on the device, and the one-off move from the keys
 * the app used before it was renamed.
 *
 * The old name is left in exactly one place — `LEGACY_PREFIX` below — so that a
 * future search for it finds the migration and nothing else.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const PREFIX = 'graceguitar.';
export const LEGACY_PREFIX = 'kinnor.';

export const STORAGE_KEYS = {
  settings: `${PREFIX}settings.v1`,
  songs: `${PREFIX}songs.v1`,
  /**
   * La bibliothèque du lot 3 : les chants en chiffrage Nashville et les sets avec
   * leur tonalité du jour. `v1` reste déclarée pour que la migration puisse la lire.
   */
  library: `${PREFIX}library.v2`,
} as const;

/** The slice of AsyncStorage the migration needs, so a test can pass a fake. */
export interface KeyValueStore {
  getAllKeys(): Promise<readonly string[]>;
  multiGet(keys: string[]): Promise<readonly (readonly [string, string | null])[]>;
  multiSet(pairs: [string, string][]): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
}

export interface MigrationEntry {
  from: string;
  to: string;
  /**
   * False when the destination already holds data. The live key wins: copying a
   * stale blob over it would throw away everything written since the rename.
   */
  copy: boolean;
}

/**
 * Which legacy keys move where — pure, so the rule can be tested without a
 * device. Keys already under the new prefix are not touched at all.
 */
export function migrationPlan(keys: readonly string[]): MigrationEntry[] {
  const present = new Set(keys);
  const plan: MigrationEntry[] = [];
  for (const key of keys) {
    if (!key.startsWith(LEGACY_PREFIX)) continue;
    const to = PREFIX + key.slice(LEGACY_PREFIX.length);
    plan.push({ from: key, to, copy: !present.has(to) });
  }
  return plan;
}

/** Copies the legacy values across, then removes the legacy keys. */
export async function migrateLegacyKeys(store: KeyValueStore): Promise<MigrationEntry[]> {
  const entries = migrationPlan(await store.getAllKeys());
  if (!entries.length) return [];

  const toCopy = entries.filter((e) => e.copy);
  if (toCopy.length) {
    const values = new Map(await store.multiGet(toCopy.map((e) => e.from)));
    const pairs: [string, string][] = [];
    for (const entry of toCopy) {
      const value = values.get(entry.from);
      // A key that was removed between the listing and the read has nothing to
      // carry over; it still gets cleaned up below.
      if (value != null) pairs.push([entry.to, value]);
    }
    if (pairs.length) await store.multiSet(pairs);
  }

  await store.multiRemove(entries.map((e) => e.from));
  return entries;
}

const deviceStore: KeyValueStore = {
  getAllKeys: () => AsyncStorage.getAllKeys(),
  multiGet: (keys) => AsyncStorage.multiGet(keys),
  multiSet: (pairs) => AsyncStorage.multiSet(pairs),
  multiRemove: (keys) => AsyncStorage.multiRemove(keys),
};

let pending: Promise<MigrationEntry[]> | null = null;

/**
 * Runs the migration once per launch, however many stores ask for it.
 *
 * Every store awaits this before its first read, so none of them can read an
 * empty prefix and conclude the user has never used the app. A failure is
 * swallowed on purpose: the app then starts fresh rather than not starting.
 */
export function ensureMigrated(): Promise<MigrationEntry[]> {
  pending ??= migrateLegacyKeys(deviceStore).catch(() => []);
  return pending;
}
