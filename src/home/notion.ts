/**
 * La notion du jour : une chose à comprendre, et de quoi la voir.
 *
 * Elle change chaque jour plutôt que chaque semaine — c'est une idée courte, pas
 * un programme — et elle est tirée d'une liste écrite à la main. Une notion, c'est
 * un nom, deux lignes d'explication, un accord à regarder, et la leçon qui va plus
 * loin : les trois premiers sont dans les dictionnaires, le quatrième est ici.
 *
 * Le schéma et la leçon ne sont pas la même chose : la notion du jour montre un
 * accord du bout des doigts, la leçon explique. Renvoyer vers la leçon est un
 * bouton, pas une obligation.
 */
import { ChordId } from '../theory/chords';
import { LessonId } from '../theory/lessons';
import { seedOf } from './day';

export type NotionId = 'third' | 'fifth' | 'octave' | 'barre' | 'capo' | 'nashville';

export interface Notion {
  id: NotionId;
  /** La fondamentale du schéma, en classe de hauteur. */
  root: number;
  chord: ChordId;
  /** La leçon à ouvrir pour aller plus loin. */
  lesson: LessonId;
}

/**
 * Les notions, chacune avec l'accord qui la montre.
 *
 * Les fondamentales sont choisies pour que le schéma soit lisible dans les
 * premières cases : une notion qu'on ne peut pas regarder sans faire défiler le
 * manche demande plus d'effort que ce qu'elle apprend.
 */
export const NOTIONS: Notion[] = [
  { id: 'third', root: 0, chord: 'maj', lesson: 'chords' },
  { id: 'fifth', root: 7, chord: 'maj', lesson: 'chords' },
  { id: 'octave', root: 7, chord: 'maj', lesson: 'octaves' },
  { id: 'barre', root: 5, chord: 'maj', lesson: 'caged' },
  { id: 'capo', root: 2, chord: 'maj', lesson: 'capo' },
  { id: 'nashville', root: 7, chord: 'maj', lesson: 'nashville' },
];

export function notionOfDay(today: string): Notion {
  return NOTIONS[seedOf(today) % NOTIONS.length];
}
