/**
 * Ce qu'un écran demande à une bibliothèque de chants : quel set vient, quels
 * chants on a joués récemment, et lesquels répondent à une recherche.
 *
 * Pur et testé, comme le reste : ces questions se répondent sans React, et une
 * recherche qui ne trouve pas « Noël » quand on tape « noel » est un bug de
 * logique, pas de mise en page.
 */
import { Song, WorshipSet } from './model';

/**
 * Les diacritiques du français, et eux seuls.
 *
 * `String.normalize` n'existe pas sur tous les moteurs JS que React Native peut
 * utiliser ; une table explicite donne le même résultat partout, et elle se relit.
 */
const FOLD: Record<string, string> = {
  à: 'a', â: 'a', ä: 'a', á: 'a', ã: 'a', å: 'a',
  ç: 'c',
  è: 'e', é: 'e', ê: 'e', ë: 'e',
  î: 'i', ï: 'i', í: 'i', ì: 'i',
  ô: 'o', ö: 'o', ó: 'o', ò: 'o', õ: 'o',
  ù: 'u', û: 'u', ü: 'u', ú: 'u',
  ÿ: 'y',
  ñ: 'n',
  œ: 'oe', æ: 'ae',
};

/** Minuscules, sans accents : « Noël » et « noel » se ressemblent enfin. */
export function fold(text: string): string {
  let out = '';
  for (const char of text.toLowerCase()) out += FOLD[char] ?? char;
  return out;
}

/**
 * Le prochain set : celui dont la date n'est pas passée, sinon le dernier joué.
 *
 * « Prochain » veut dire à venir — un set daté d'aujourd'hui est à venir jusqu'à
 * la fin de la journée. Quand tout est passé, on montre le plus récent plutôt que
 * rien : c'est celui dont on se souvient, et celui qu'on veut corriger.
 */
export function nextSet(sets: WorshipSet[], today: string): WorshipSet | null {
  if (!sets.length) return null;
  const byDate = [...sets].sort((a, b) => a.date.localeCompare(b.date));
  return byDate.find((s) => s.date >= today) ?? byDate[byDate.length - 1];
}

/**
 * Les chants qui répondent à une recherche, les plus récents d'abord.
 *
 * Le titre qui *commence* par ce qu'on a tapé passe avant celui qui le contient :
 * taper « gl » doit proposer « Gloire à Dieu » avant « À toi la gloire ».
 */
export function searchSongs(songs: Song[], query: string, limit = 20): Song[] {
  const needle = fold(query.trim());
  const byRecent = [...songs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (!needle) return byRecent.slice(0, limit);
  const starts: Song[] = [];
  const contains: Song[] = [];
  for (const song of byRecent) {
    const title = fold(song.title);
    if (title.startsWith(needle)) starts.push(song);
    else if (title.includes(needle)) contains.push(song);
  }
  return [...starts, ...contains].slice(0, limit);
}

/** Les derniers chants touchés, pour la section « Mes chants ». */
export const recentSongs = (songs: Song[], limit = 5): Song[] =>
  [...songs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit);

/**
 * Les chants d'un set que la bibliothèque ne connaît pas encore.
 *
 * Sert à l'aperçu d'un set reçu : on annonce ce qui sera ajouté avant de le faire.
 */
export function missingSongs(set: WorshipSet, songs: Song[]): string[] {
  const known = new Set(songs.map((s) => s.id));
  return set.songs.filter((entry) => !known.has(entry.songId)).map((entry) => entry.songId);
}

/**
 * Le prochain dimanche où le set n'est pas encore prêt.
 *
 * Une seule question, pour la notification du jeudi soir : le set du dimanche qui
 * vient a-t-il des chants ? Un set vide est le seul cas qui mérite d'être rappelé.
 */
export function sundayNeedsSongs(sets: WorshipSet[], today: string, sunday: string): boolean {
  const set = nextSet(sets, today);
  if (!set) return true;
  return set.date === sunday && set.songs.length === 0;
}
