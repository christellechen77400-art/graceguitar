/**
 * The theory course: which lesson comes when, and what each one shows on the neck.
 *
 * The words are not here. Every lesson exists in French and English, so they live
 * in the two data files beside this one, typed against the French version so the
 * two can never drift apart. A lesson is a page of text, one fretboard to look at
 * while reading it, and three questions.
 */
import type { Marker, MarkerKind } from '../components/Fretboard';
import { chordById, chordPcs, ChordId, chordToneLabel } from './chords';
import { FRET_COUNT, INTERVAL_LABELS, mod12, pcAt, STRING_COUNT } from './notes';
import { ScaleId, scaleById } from './scales';

export type LessonId =
  | 'strings'
  | 'naturals'
  | 'octaves'
  | 'intervals'
  | 'majorScale'
  | 'keys'
  | 'chords'
  | 'chordFamilies'
  | 'caged'
  | 'capo'
  | 'nashville'
  | 'ear';

/** What the fretboard shows next to the text. Data, so no screen builds a neck. */
export interface LessonBoard {
  /** Root of the scale or chord, as a pitch class. */
  root: number;
  scale?: ScaleId;
  chord?: ChordId;
  /** Slide the board to this fret when the lesson opens. */
  focusFret?: number;
}

export interface LessonQuestion {
  prompt: string;
  choices: string[];
  /** Index into `choices`. */
  answer: number;
  /** Shown after answering, right or wrong: what to remember. */
  explain: string;
}

export interface LessonContent {
  title: string;
  /** Two or three short paragraphs, read standing up. */
  body: string[];
  /** Exactly three, checked by the tests. */
  questions: LessonQuestion[];
}

export type LessonText = Record<LessonId, LessonContent>;

/** The order the course is taught in. */
export const LESSON_ORDER: LessonId[] = [
  'strings',
  'naturals',
  'octaves',
  'intervals',
  'majorScale',
  'keys',
  'chords',
  'chordFamilies',
  'caged',
  'capo',
  'nashville',
  'ear',
];

/**
 * The neck each lesson shows.
 *
 * Chosen to be the thing the text is describing and nothing more: a lesson about
 * the five open strings shows no scale, and the CAGED lesson shows one chord, so
 * the eye is not asked to filter.
 */
export const LESSON_BOARDS: Record<LessonId, LessonBoard> = {
  strings: { root: 4 },
  naturals: { root: 0, scale: 'major' },
  octaves: { root: 7, scale: 'majorPent', focusFret: 3 },
  intervals: { root: 0, scale: 'major' },
  majorScale: { root: 0, scale: 'major' },
  keys: { root: 2, scale: 'major' },
  chords: { root: 0, chord: 'maj' },
  chordFamilies: { root: 9, chord: 'min' },
  caged: { root: 0, chord: 'maj' },
  capo: { root: 2, chord: 'maj', focusFret: 2 },
  nashville: { root: 7, scale: 'major' },
  ear: { root: 7, scale: 'major' },
};

/** Questions per lesson. */
export const QUESTIONS_PER_LESSON = 3;

/**
 * Ce qu'un schéma montre : toutes les positions, pas une seule.
 *
 * Sur une leçon qui explique où vit une note, un seul point serait un mensonge —
 * et sur un accord, c'est l'accord entier qu'on veut voir. Chaque point porte son
 * degré : c'est ce qu'on lit sur un schéma d'accord, et une leçon qui montre un
 * manche muet ne dit rien de plus qu'une photo.
 *
 * Pur, et hors de l'écran : c'est le même calcul pour la leçon et pour la notion
 * du jour, qui montre le même genre de schéma.
 */
export function boardMarkers(board: LessonBoard): Marker[] {
  const chord = board.chord ? chordById(board.chord) : null;
  const pcs = board.scale
    ? scaleById(board.scale).intervals.map((i) => mod12(board.root + i))
    : chord
      ? chordPcs(board.root, chord)
      : [];
  if (!pcs.length) return [];

  const out: Marker[] = [];
  for (let string = 0; string < STRING_COUNT; string++) {
    for (let fret = 0; fret <= FRET_COUNT; fret++) {
      const pc = pcAt(string, fret);
      if (!pcs.includes(pc)) continue;
      const kind: MarkerKind = pc === board.root ? 'root' : chord ? 'chord' : 'tone';
      const label =
        pc === board.root ? undefined : chord ? chordToneLabel(chord, board.root, pc) : INTERVAL_LABELS[mod12(pc - board.root)];
      out.push({ string, fret, kind, label });
    }
  }
  return out;
}

/**
 * A lesson is well formed when it asks three questions and every one of them has
 * a choice that is the answer. Checked in the theory test, not at runtime.
 */
export function isComplete(lesson: LessonContent): boolean {
  return (
    lesson.questions.length === QUESTIONS_PER_LESSON &&
    lesson.body.length > 0 &&
    Boolean(lesson.title.trim()) &&
    lesson.questions.every(
      (q) => q.choices.length >= 2 && q.answer >= 0 && q.answer < q.choices.length && Boolean(q.prompt.trim()),
    )
  );
}

/** How many of the three were answered right. */
export function scoreLesson(lesson: LessonContent, answers: (number | null)[]): number {
  return lesson.questions.filter((q, i) => answers[i] === q.answer).length;
}
