import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { dictionaries, Dict, Lang } from '../i18n';
import { DEFAULT_PRACTICE, PracticeSettings, ProgressMap } from '../practice/engine';
import { Level } from '../practice/onboarding';
import { Notation } from '../theory/notes';

export type DisplayMode = 'clean' | 'notes' | 'intervals';

export interface Settings {
  lang: Lang;
  notation: Notation;
  keyRoot: number;
  display: DisplayMode;
  sound: boolean;
  /** Last settings used for an exercise, so a run resumes where it left off. */
  practice: PracticeSettings;
  /** Per-cell practice record, keyed by "<string>:<fret>". */
  progress: ProgressMap;
  /** Days practised, as YYYY-MM-DD, for the streak. */
  practiceDays: string[];
  /** False until the welcome questions have been answered or skipped. */
  onboarded: boolean;
  /** Starting level from those questions, 1 to 3. */
  level: Level;
}

const DEFAULTS: Settings = {
  lang: 'fr',
  notation: 'anglo',
  keyRoot: 7,
  display: 'notes',
  sound: true,
  practice: DEFAULT_PRACTICE,
  progress: {},
  practiceDays: [],
  onboarded: false,
  level: 2,
};
const STORAGE_KEY = 'kinnor.settings.v1';

/**
 * Merges a stored blob over the defaults.
 *
 * A plain spread would drop keys added since the blob was written — and worse,
 * a stored `practice` object missing a later field would leave that field
 * undefined rather than defaulted. Nested settings are merged one level down.
 */
function hydrate(raw: string): Settings {
  const stored = JSON.parse(raw) as Partial<Settings>;
  return {
    ...DEFAULTS,
    ...stored,
    practice: { ...DEFAULTS.practice, ...(stored.practice ?? {}) },
    progress: stored.progress ?? {},
    practiceDays: stored.practiceDays ?? [],
    // A blob written before the welcome questions existed has no flag; treating it
    // as answered keeps the questions from appearing to someone already using the app.
    onboarded: stored.onboarded ?? true,
    level: stored.level ?? DEFAULTS.level,
  };
}

interface Ctx {
  settings: Settings;
  /** Effective notation: English always uses letter names. */
  notation: Notation;
  t: Dict;
  /** False until the stored settings have been read, so nothing flashes on launch. */
  ready: boolean;
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setSettings(hydrate(raw));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      settings,
      ready,
      notation: settings.lang === 'en' ? 'anglo' : settings.notation,
      t: dictionaries[settings.lang],
      update: (patch) =>
        setSettings((prev) => {
          const next = { ...prev, ...patch };
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
          return next;
        }),
    }),
    [settings, ready],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
