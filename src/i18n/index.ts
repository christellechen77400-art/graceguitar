import { en } from './en';
import { fr, Dict } from './fr';

export type Lang = 'fr' | 'en';
export const dictionaries: Record<Lang, Dict> = { fr, en };
export type { Dict };

/**
 * Une date en clair — « dimanche 27 septembre ».
 *
 * Le jour et le mois viennent du dictionnaire : l'ordre des mots, lui, est dans
 * `format`, parce qu'il change d'une langue à l'autre et pas seulement de mot.
 * `Date.UTC` est utilisé partout : une date de set est un jour, pas un instant, et
 * la lire dans le fuseau local la ferait reculer d'un jour à l'ouest de Greenwich.
 */
export function formatDay(iso: string, t: Dict): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return t.date.format(t.date.days[date.getUTCDay()], date.getUTCDate(), t.date.months[date.getUTCMonth()]);
}

/**
 * La même date, en tête de ligne.
 *
 * Une date de set se lit au milieu d'une phrase — « dimanche 27 septembre » — mais
 * celle de l'accueil est seule sur sa ligne, et une ligne commence par une
 * majuscule. La règle est la même dans les deux langues, donc elle s'écrit ici.
 */
export function formatDayTitle(iso: string, t: Dict): string {
  const text = formatDay(iso, t);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Le nom d'une section : « verse » devient « Couplet », et un nom libre reste tel
 * quel. Une grille importée peut nommer ses sections dans n'importe quelle langue ;
 * seul ce que l'app propose elle-même se traduit.
 */
export function sectionLabel(name: string, t: Dict): string {
  return (t.worship.sections as Record<string, string>)[name] ?? name;
}
