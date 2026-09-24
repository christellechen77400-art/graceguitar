/**
 * Les phrases qu'on écrit sous un chant ou sous un set.
 *
 * Elles sont ici parce que trois écrans disent la même chose — la fiche d'un
 * chant, le set, et l'accueil — et que trois formulations d'une même ligne finissent
 * toujours par diverger. Ce sont des phrases, pas de la musique : elles ne
 * calculent rien, elles nomment.
 */
import { Dict } from '../i18n';
import { Song, SongSource, WorshipSet } from './model';
import { noteName, Notation, prefersFlats } from '../theory/notes';

/**
 * D'où vient le chant, en clair.
 *
 * La source dit `chordpro` — le format — et l'écran dit « Importé », ce qui est ce
 * que la personne a fait. C'est la seule des quatre dont les deux mots diffèrent.
 */
export function originLabel(source: SongSource, t: Dict): string {
  return source === 'chordpro' ? t.worship.origin.imported : t.worship.origin[source];
}

/** « Tonalité Sol · capo 2 », ou la tonalité seule quand il n'y a pas de capo. */
export function songLine(key: number, capo: number, notation: Notation, t: Dict): string {
  const parts = [`${t.key} ${noteName(key, notation, prefersFlats(key))}`];
  if (capo) parts.push(`${t.sets.capo} ${capo}`);
  return parts.join(' · ');
}

/**
 * D'où vient le set.
 *
 * Un set reçu porte le prénom de qui l'a envoyé : c'est la seule source qui ne se
 * reconnaît pas à son nom. Un set venu d'une source qu'on ne connaît pas est
 * présenté comme saisi à la main, ce qu'il est tant qu'aucune autre source n'est
 * branchée.
 */
export function setSourceLabel(set: WorshipSet, t: Dict): string {
  if (set.source === 'shared' && set.from) return t.worship.from(set.from);
  const known = t.worship.origin as Record<string, string | undefined>;
  return known[set.source] ?? t.worship.origin.manual;
}
