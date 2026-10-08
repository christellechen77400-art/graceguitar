import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { dictionaries, Dict, Lang } from '../i18n';
import { DEFAULT_PRACTICE, PracticeSettings, ProgressMap, RunRecord } from '../practice/engine';
import { cleanWidgets, DEFAULT_WIDGETS, WidgetId } from '../home/widgets';
import { Level } from '../practice/onboarding';
import { ProgressEvent } from '../services/merge';
import { Notation } from '../theory/notes';
import type { StringSetId } from '../theory/triads';
import { DEFAULT_CAPO_SHAPES } from '../theory/worship';
// Type-only on purpose: `theme.ts` imports `useSettings` from here, and a value
// import in this direction would close the cycle.
import type { Appearance } from '../theme';
import { ensureMigrated, STORAGE_KEYS } from './storage';

export type DisplayMode = 'clean' | 'notes' | 'intervals';

/** La main qui joue. Le manche gaucher n'est pas encore dessiné. */
export type Hand = 'right' | 'left';

export interface Settings {
  lang: Lang;
  notation: Notation;
  keyRoot: number;
  display: DisplayMode;
  sound: boolean;
  /** Light, dark, or whatever the phone is set to. */
  appearance: Appearance;
  /** Shown in the greeting, and sent with the profile on sign-up. */
  firstName: string;
  /** The shapes the player likes to play with a capo, as pitch classes. */
  preferredShapes: number[];
  /** Last settings used for an exercise, so a run resumes where it left off. */
  practice: PracticeSettings;
  /** Per-cell practice record, keyed by "<string>:<fret>". */
  progress: ProgressMap;
  /** Days practised, as YYYY-MM-DD, for the streak. */
  practiceDays: string[];
  /** The last runs, newest last: the only place a duration is written down. */
  runs: RunRecord[];
  /**
   * Les réponses enregistrées, dans l'ordre, pour pouvoir être envoyées au compte.
   *
   * Elles ne servent pas à afficher la progression — `progress` le fait déjà, et
   * plus vite. Elles servent à la reconstruire ailleurs : deux appareils qui
   * additionneraient chacun leurs totaux se tromperaient, alors que deux listes de
   * réponses se relisent et donnent le même résultat partout.
   */
  events: ProgressEvent[];
  /** Thursday-evening reminder when Sunday's set is still empty. Off by default. */
  reminders: boolean;
  /** A nudge to play, every day at `reminderHour`. Off by default. */
  dailyReminder: boolean;
  /** The hour of that nudge, 6 to 22. */
  reminderHour: number;
  /** What the player aims for in a day, in minutes. */
  goalMinutes: number;
  /** Left-handed necks are not drawn yet; the setting waits for them. */
  hand: Hand;
  /** Playback volume, 0 to 1. */
  volume: number;
  /** False until the welcome questions have been answered or skipped. */
  onboarded: boolean;
  /** Starting level from those questions, 1 to 3. */
  level: Level;
  /** Les widgets de l'Accueil, dans l'ordre choisi. */
  homeWidgets: WidgetId[];
  /** Acoustique ou électrique : en électrique, on ne propose pas de capo. */
  guitar: 'acoustic' | 'electric';
  /** Le chant dont on regarde les triades, ou null. */
  triadSongId: string | null;
  /** La zone des triades : première et dernière case. */
  zoneLo: number;
  zoneHi: number;
  stringSet: StringSetId;
}

/** La zone proposée au départ : celle des chants d'essai (cases 5 à 10). */
export const DEFAULT_ZONE = { lo: 5, hi: 10 };

const DEFAULTS: Settings = {
  lang: 'fr',
  // Une église francophone lit Do Ré Mi ; C D E se choisit dans Moi.
  notation: 'latin',
  keyRoot: 7,
  display: 'notes',
  sound: true,
  // Jour par défaut : c'est la charte (ivoire et marron). Sombre se choisit dans Moi.
  appearance: 'light',
  firstName: '',
  // G, C and D: the three shapes most worship songs are actually played in.
  preferredShapes: DEFAULT_CAPO_SHAPES,
  practice: DEFAULT_PRACTICE,
  progress: {},
  practiceDays: [],
  runs: [],
  events: [],
  reminders: false,
  dailyReminder: false,
  reminderHour: 19,
  goalMinutes: 10,
  hand: 'right',
  volume: 0.7,
  onboarded: false,
  level: 2,
  homeWidgets: DEFAULT_WIDGETS,
  guitar: 'acoustic',
  triadSongId: null,
  zoneLo: DEFAULT_ZONE.lo,
  zoneHi: DEFAULT_ZONE.hi,
  stringSet: 'sol-si-mi',
};
const STORAGE_KEY = STORAGE_KEYS.settings;

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
    runs: stored.runs ?? [],
    events: Array.isArray(stored.events) ? stored.events : [],
    reminders: stored.reminders ?? false,
    dailyReminder: stored.dailyReminder ?? false,
    reminderHour: stored.reminderHour ?? DEFAULTS.reminderHour,
    goalMinutes: stored.goalMinutes ?? DEFAULTS.goalMinutes,
    hand: stored.hand ?? DEFAULTS.hand,
    volume: stored.volume ?? DEFAULTS.volume,
    // A blob written before the welcome questions existed has no flag; treating it
    // as answered keeps the questions from appearing to someone already using the app.
    onboarded: stored.onboarded ?? true,
    level: stored.level ?? DEFAULTS.level,
    homeWidgets: cleanWidgets(stored.homeWidgets),
    guitar: stored.guitar === 'electric' ? 'electric' : 'acoustic',
    triadSongId: stored.triadSongId ?? null,
    zoneLo: stored.zoneLo ?? DEFAULTS.zoneLo,
    zoneHi: stored.zoneHi ?? DEFAULTS.zoneHi,
    stringSet: stored.stringSet ?? DEFAULTS.stringSet,
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
    // Reading before the rename migration has run would find nothing under the
    // new prefix and look like a first launch.
    ensureMigrated()
      .then(() => AsyncStorage.getItem(STORAGE_KEY))
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
