/**
 * Le passage du carnet au compte, et retour.
 *
 * Le serveur parle en colonnes ; l'app parle en chants et en sets. La traduction
 * est ici, pure, pour deux raisons : on peut la tester sans serveur, et surtout on
 * peut vérifier d'un coup d'œil ce qui sort du téléphone. Ce qui n'y est pas n'en
 * sort pas — les paroles, d'abord, qui n'ont aucune colonne et ne sont jamais
 * recopiées dans une ligne.
 *
 * Les noms de colonnes sont ceux du schéma (`supabase/schema.sql`) : c'est le
 * contrat, et il vaut mieux le voir écrit une fois que deviné partout.
 */
// Types seulement : ce fichier est lu par `scripts/theory-check.ts`, qui tourne
// sous Node et ne sait pas charger React Native. Un import de valeur vers les
// réglages entraînerait AsyncStorage, et donc l'app entière, derrière lui.
import type { Lang } from '../i18n';
import type { Level } from '../practice/onboarding';
import type { Hand } from '../state/settings';
import type { Mode } from '../theory/nashville';
import type { Notation } from '../theory/notes';
import type { ProgressEvent } from './merge';
import type { Section, SetSong, Song, SongSource, WorshipSet } from '../songs/model';

export interface ProfileRow {
  id: string;
  first_name: string;
  level: number;
  locale: string;
  notation: string;
  handedness: string;
  preferred_capo_shapes: number[];
  daily_goal_minutes: number;
  reminder_time: number;
  updated_at: string;
}

export interface SongRow {
  id: string;
  user_id: string;
  title: string;
  default_key: number;
  mode: Mode;
  sections: Section[] | null;
  tempo: number | null;
  notes: string | null;
  reference_url: string | null;
  source: SongSource;
  updated_at: string;
}

export interface SetRow {
  id: string;
  user_id: string;
  service_date: string;
  service_name: string | null;
  source: string;
  updated_at: string;
}

export interface SetSongRow {
  id: string;
  set_id: string;
  song_id: string;
  key: number;
  capo: number;
  position: number;
}

export interface EventRow {
  id: string;
  user_id: string;
  exercise_id: string;
  string: number;
  fret: number;
  correct: boolean;
  response_ms: number;
  created_at: string;
}

/** Un profil à partir des réglages du téléphone. */
export function profileRow(
  id: string,
  settings: {
    firstName: string;
    level: number;
    lang: string;
    notation: string;
    hand: string;
    preferredShapes: number[];
    goalMinutes: number;
    reminderHour: number;
  },
  now: Date,
): ProfileRow {
  return {
    id,
    first_name: settings.firstName,
    level: settings.level,
    locale: settings.lang,
    notation: settings.notation,
    handedness: settings.hand,
    preferred_capo_shapes: settings.preferredShapes,
    daily_goal_minutes: settings.goalMinutes,
    reminder_time: settings.reminderHour,
    updated_at: now.toISOString(),
  };
}

/**
 * Un chant, sans ses paroles.
 *
 * `lyrics` n'est pas recopiée et n'a pas de colonne : elle reste sur l'appareil,
 * comme le dit la politique de confidentialité.
 */
export function songRow(song: Song, userId: string): SongRow {
  return {
    id: song.id,
    user_id: userId,
    title: song.title,
    default_key: song.defaultKey,
    mode: song.mode,
    sections: song.sections ?? null,
    tempo: song.tempo ?? null,
    notes: song.notes ?? null,
    reference_url: song.referenceUrl ?? null,
    source: song.source,
    updated_at: song.updatedAt,
  };
}

export function setRow(set: WorshipSet, userId: string, now: Date): SetRow {
  return {
    id: set.id,
    user_id: userId,
    service_date: set.date,
    service_name: set.serviceName ?? null,
    source: set.source,
    updated_at: set.updatedAt ?? now.toISOString(),
  };
}

/** L'identifiant d'une ligne de set est le couple set + chant : une seule place. */
export function setSongRow(setId: string, entry: SetSong): SetSongRow {
  return {
    id: `${setId}:${entry.songId}`,
    set_id: setId,
    song_id: entry.songId,
    key: entry.key,
    capo: entry.capo,
    position: entry.order,
  };
}

export function eventRow(event: ProgressEvent, userId: string): EventRow {
  return {
    id: event.id,
    user_id: userId,
    exercise_id: event.exerciseId,
    string: event.string,
    fret: event.fret,
    correct: event.correct,
    response_ms: event.ms,
    created_at: event.createdAt,
  };
}

/** Le chemin inverse : une ligne redevient un chant, ou rien si elle est vide. */
export function rowToSong(row: SongRow, lyrics?: string): Song {
  return {
    id: row.id,
    title: row.title,
    defaultKey: row.default_key,
    mode: row.mode,
    sections: row.sections ?? undefined,
    tempo: row.tempo ?? undefined,
    notes: row.notes ?? undefined,
    referenceUrl: row.reference_url ?? undefined,
    source: row.source,
    updatedAt: row.updated_at,
    // Les paroles du téléphone ne sont jamais remplacées par ce qui vient du
    // compte : le compte n'en a pas, et une absence n'est pas un effacement.
    lyrics,
  };
}

export function rowToSet(row: SetRow, entries: SetSongRow[]): WorshipSet {
  return {
    id: row.id,
    date: row.service_date,
    serviceName: row.service_name ?? undefined,
    source: row.source,
    updatedAt: row.updated_at,
    songs: [...entries]
      .sort((a, b) => a.position - b.position)
      .map((entry) => ({ songId: entry.song_id, key: entry.key, capo: entry.capo, order: entry.position })),
  };
}

export function rowToEvent(row: EventRow): ProgressEvent {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    string: row.string,
    fret: row.fret,
    correct: row.correct,
    ms: row.response_ms,
    createdAt: row.created_at,
  };
}

/**
 * Les réglages que le compte ramène.
 *
 * Seulement ceux qui décrivent le joueur — le prénom, le niveau, la langue, la
 * notation, la main, les formes de capo, l'objectif et l'heure du rappel. Ceux qui
 * décrivent le téléphone — l'apparence, le son, le volume — restent ici : ils
 * n'ont pas de sens sur un autre appareil.
 */
export interface ProfilePatch {
  firstName?: string;
  level?: Level;
  lang?: Lang;
  notation?: Notation;
  hand?: Hand;
  preferredShapes?: number[];
  goalMinutes?: number;
  reminderHour?: number;
}

export function settingsFromProfile(row: Partial<ProfileRow>): ProfilePatch {
  const patch: ProfilePatch = {};
  if (typeof row.first_name === 'string') patch.firstName = row.first_name;
  // Le niveau est un des trois de l'accueil ; une valeur d'ailleurs est ignorée
  // plutôt que recopiée telle quelle dans les réglages.
  if (row.level === 1 || row.level === 2 || row.level === 3) patch.level = row.level;
  if (row.locale === 'fr' || row.locale === 'en') patch.lang = row.locale;
  if (row.notation === 'anglo' || row.notation === 'latin') patch.notation = row.notation;
  if (row.handedness === 'right' || row.handedness === 'left') patch.hand = row.handedness;
  if (Array.isArray(row.preferred_capo_shapes)) patch.preferredShapes = row.preferred_capo_shapes;
  if (typeof row.daily_goal_minutes === 'number') patch.goalMinutes = row.daily_goal_minutes;
  if (typeof row.reminder_time === 'number') patch.reminderHour = row.reminder_time;
  return patch;
}
