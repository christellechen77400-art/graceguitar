/**
 * Exercise generation and scoring. Pure: no React, no storage, no timers.
 *
 * Everything is driven by a seeded generator so a run can be replayed exactly,
 * which is what makes the tests below meaningful rather than flaky.
 */
import type { Marker, MarkerKind } from '../components/Fretboard';
import { ChordId, chordById, chordPcs } from '../theory/chords';
import { fretToMidi, mod12, OPEN_MIDI, pcAt, STRING_COUNT } from '../theory/notes';
import { capoOptions, DIATONIC } from '../theory/worship';

export type ExerciseId =
  | 'nameNote'
  | 'findNote'
  | 'allOfNote'
  | 'chordTone'
  | 'capoExpress'
  | 'transpose'
  | 'earQuality'
  | 'earDegree';

export type ExerciseSection = 'neck' | 'chordsEar' | 'theory';

export interface Exercise {
  id: ExerciseId;
  section: ExerciseSection;
  /** Exercises that need a run of several questions, against a single prompt. */
  multi: boolean;
}

export const EXERCISES: Exercise[] = [
  { id: 'nameNote', section: 'neck', multi: true },
  { id: 'findNote', section: 'neck', multi: true },
  { id: 'allOfNote', section: 'neck', multi: false },
  { id: 'chordTone', section: 'chordsEar', multi: false },
  { id: 'capoExpress', section: 'chordsEar', multi: true },
  { id: 'transpose', section: 'chordsEar', multi: true },
  { id: 'earQuality', section: 'chordsEar', multi: true },
  { id: 'earDegree', section: 'chordsEar', multi: true },
];

export const exerciseById = (id: ExerciseId) => EXERCISES.find((e) => e.id === id)!;

/** Fret zones offered before a run. */
export const ZONES = [
  { from: 0, to: 5 },
  { from: 5, to: 9 },
  { from: 0, to: 12 },
];

export interface PracticeSettings {
  strings: number[];
  zoneFrom: number;
  zoneTo: number;
  accidentals: boolean;
  questionCount: number;
  timed: boolean;
}

export const DEFAULT_PRACTICE: PracticeSettings = {
  strings: [0, 1, 2, 3, 4, 5],
  zoneFrom: 0,
  zoneTo: 12,
  accidentals: false,
  questionCount: 10,
  timed: false,
};

/** The seven white keys, as pitch classes. */
export const NATURAL_PCS = [0, 2, 4, 5, 7, 9, 11];

export const QUESTION_COUNTS = [5, 10, 15, 20];

// ---------------------------------------------------------------- generation

/** Deterministic generator, so a seed always produces the same run. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

const pick = <T,>(rng: Rng, xs: T[]): T => xs[Math.floor(rng() * xs.length)];

/** Every playable cell inside the settings' strings and fret zone. */
export function cells(s: PracticeSettings): { string: number; fret: number }[] {
  const out: { string: number; fret: number }[] = [];
  for (const string of s.strings) {
    for (let fret = s.zoneFrom; fret <= s.zoneTo; fret++) {
      if (!s.accidentals && !NATURAL_PCS.includes(pcAt(string, fret))) continue;
      out.push({ string, fret });
    }
  }
  return out;
}

export type Question =
  | { exercise: 'nameNote'; string: number; fret: number; choices: number[]; answer: number }
  | { exercise: 'findNote'; string: number; pc: number }
  | { exercise: 'allOfNote'; pc: number; targets: { string: number; fret: number }[] }
  | { exercise: 'chordTone'; root: number; chord: ChordId; tone: 'third' | 'fifth'; answer: number }
  | { exercise: 'capoExpress'; key: number; shapeKey: number; capo: number }
  | { exercise: 'transpose'; key: number; degrees: number[]; answers: number[] }
  | { exercise: 'earQuality'; root: number; quality: 'maj' | 'min' }
  | { exercise: 'earDegree'; key: number; degree: number };

/** Pitch classes a question can ask about, honouring the accidentals setting. */
const pcPool = (s: PracticeSettings) => (s.accidentals ? Array.from({ length: 12 }, (_, i) => i) : NATURAL_PCS);

/** "What note is this?", with four choices and the answer among them once. */
export function nameNoteQuestion(string: number, fret: number, s: PracticeSettings, rng: Rng): Question {
  const answer = pcAt(string, fret);
  const pool = pcPool(s).filter((pc) => pc !== answer);
  const choices = [answer];
  while (choices.length < 4 && choices.length <= pool.length) {
    const pc = pick(rng, pool);
    if (!choices.includes(pc)) choices.push(pc);
  }
  // Shuffle so the answer is not always in the same place.
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { exercise: 'nameNote', string, fret, choices, answer };
}

export function makeQuestion(id: ExerciseId, s: PracticeSettings, rng: Rng): Question {
  switch (id) {
    case 'nameNote': {
      const cell = pick(rng, cells(s));
      return nameNoteQuestion(cell.string, cell.fret, s, rng);
    }

    case 'findNote': {
      // Ask for a note that is actually reachable with the chosen strings and zone.
      const reachable = new Set(cells(s).map((c) => pcAt(c.string, c.fret)));
      const pc = pick(rng, pcPool(s).filter((p) => reachable.has(p)));
      const string = pick(rng, s.strings);
      return { exercise: 'findNote', string, pc };
    }

    case 'allOfNote': {
      const reachable = new Set(cells(s).map((c) => pcAt(c.string, c.fret)));
      const pc = pick(rng, pcPool(s).filter((p) => reachable.has(p)));
      return {
        exercise: 'allOfNote',
        pc,
        targets: cells(s).filter((c) => pcAt(c.string, c.fret) === pc),
      };
    }

    case 'chordTone': {
      const root = pick(rng, pcPool(s));
      const chord = chordById(pick(rng, ['maj', 'min'] as ChordId[]));
      const tone: 'third' | 'fifth' = rng() < 0.5 ? 'third' : 'fifth';
      const interval = tone === 'third' ? chord.intervals[1] : chord.intervals[2];
      return { exercise: 'chordTone', root, chord: chord.id, tone, answer: mod12(root + interval) };
    }

    case 'capoExpress': {
      const key = pick(rng, pcPool(s));
      // Asking for the lowest capo keeps the answer unique: several shape
      // families can reach a key, but only one of them is the nearest.
      const best = capoOptions(key)[0];
      return { exercise: 'capoExpress', key, shapeKey: best.shapeKey, capo: best.capo };
    }

    case 'transpose': {
      const key = pick(rng, pcPool(s));
      // 1-5-6m-4 is the backbone of worship songs; the others keep it from being
      // a single memorised answer.
      const shapes: number[][] = [
        [0, 4, 5, 3],
        [0, 3, 5, 4],
        [5, 3, 0, 4],
        [0, 5, 3, 4],
      ];
      const picks = pick(rng, shapes);
      return {
        exercise: 'transpose',
        key,
        degrees: picks,
        answers: picks.map((i) => mod12(key + DIATONIC[i].degree)),
      };
    }

    case 'earQuality': {
      const root = pick(rng, pcPool(s));
      return { exercise: 'earQuality', root, quality: rng() < 0.5 ? 'maj' : 'min' };
    }

    case 'earDegree': {
      const key = pick(rng, pcPool(s));
      // The degrees a cadence actually lands on: 1, 4, 5 and 6m.
      const degree = pick(rng, [0, 5, 7, 9]);
      return { exercise: 'earDegree', key, degree };
    }
  }
}

export function makeRun(id: ExerciseId, s: PracticeSettings, seed: number): Question[] {
  const rng = mulberry32(seed);
  const exercise = exerciseById(id);
  const count = exercise.multi ? s.questionCount : 1;
  const out: Question[] = [];
  for (let i = 0; i < count; i++) out.push(makeQuestion(id, s, rng));
  return out;
}

/**
 * A workout on the chords of a set: the third of each chord, then the fifth, in
 * playing order and round again until the run is long enough.
 *
 * Root and fifth would be playable without thinking; the third is what tells major
 * from minor, which is the thing worth drilling before playing a song you have not
 * rehearsed.
 */
export function setChordRun(chords: { root: number; chord: ChordId }[], count = 12): Question[] {
  if (!chords.length) return [];
  const out: Question[] = [];
  for (let i = 0; i < count; i++) {
    const { root, chord } = chords[i % chords.length];
    const tone: 'third' | 'fifth' = i % 2 === 0 ? 'third' : 'fifth';
    const interval = tone === 'third' ? chordById(chord).intervals[1] : chordById(chord).intervals[2];
    out.push({ exercise: 'chordTone', root, chord, tone, answer: mod12(root + interval) });
  }
  return out;
}

// ------------------------------------------------------------------ checking

/** The lowest MIDI note of this pitch class, from the open low E upwards. */
export function lowestMidiFor(pc: number): number {
  for (let midi = OPEN_MIDI[0]; midi <= OPEN_MIDI[STRING_COUNT - 1] + 12; midi++) {
    if (mod12(midi) === mod12(pc)) return midi;
  }
  return OPEN_MIDI[0];
}

/**
 * A chord as real pitches, in a range a guitar actually occupies: the root is
 * placed at or above the given floor, then each interval above it. Returning raw
 * pitch classes would have the player sound four notes in the same octave.
 */
export function voiceChord(root: number, chord: ChordId, floor = 48): number[] {
  const base = lowestMidiFor(root);
  const start = base < floor ? base + 12 : base;
  return chordById(chord).intervals.map((i) => start + i);
}

/** Pitches to sound for a question, so every exercise can be heard. */
export function questionMidi(q: Question): number[] {
  switch (q.exercise) {
    case 'nameNote':
      return [fretToMidi(q.string, q.fret)];
    case 'findNote':
    case 'allOfNote':
      return [lowestMidiFor(q.pc)];
    case 'chordTone':
      return voiceChord(q.root, q.chord);
    case 'capoExpress':
      return voiceChord(q.key, 'maj');
    case 'transpose':
      return q.answers.map(lowestMidiFor);
    case 'earQuality':
      return voiceChord(q.root, q.quality);
    case 'earDegree':
      return voiceChord(q.key, degreeChord(q.degree));
  }
}

/** The diatonic chord type sitting on a scale degree, as a chord id. */
export function degreeChord(degree: number): ChordId {
  return DIATONIC.find((d) => d.degree === mod12(degree))?.type ?? 'maj';
}

// -------------------------------------------------------------------- scoring

export interface Attempt {
  correct: boolean;
  /** Response time in milliseconds. */
  ms: number;
}

export interface RunSummary {
  total: number;
  correct: number;
  /** 0..1 */
  accuracy: number;
  meanMs: number;
  /** Indexes of the questions answered wrong, for the review pass. */
  missed: number[];
}

export function summarise(attempts: Attempt[]): RunSummary {
  const total = attempts.length;
  const correct = attempts.filter((a) => a.correct).length;
  const totalMs = attempts.reduce((sum, a) => sum + a.ms, 0);
  return {
    total,
    correct,
    accuracy: total ? correct / total : 0,
    meanMs: total ? Math.round(totalMs / total) : 0,
    missed: attempts.flatMap((a, i) => (a.correct ? [] : [i])),
  };
}

/** Re-runs only the questions that were missed, in their original order. */
export function retryMissed(questions: Question[], missed: number[]): Question[] {
  return missed.filter((i) => i >= 0 && i < questions.length).map((i) => questions[i]);
}

// ------------------------------------------------------------------- history

/**
 * Ce qu'une séance terminée laisse derrière elle.
 *
 * Le compte-rendu garde le temps total, parce que c'est la seule chose qui ne se
 * retrouve pas dans la carte de progression : une position sait combien de fois on
 * l'a touchée, jamais combien de temps on y a mis. Les minutes de la semaine et le
 * meilleur temps d'un défi se lisent donc ici.
 */
export interface RunRecord {
  /** YYYY-MM-DD. */
  day: string;
  /** Les exercices posés, sans répétition, dans l'ordre d'apparition. */
  exercises: ExerciseId[];
  questions: number;
  correct: number;
  totalMs: number;
}

export function runRecord(questions: Question[], attempts: Attempt[], day: string): RunRecord {
  const exercises = questions
    .slice(0, attempts.length)
    .map((q) => q.exercise)
    .filter((id, i, all) => all.indexOf(id) === i);
  return {
    day,
    exercises,
    questions: attempts.length,
    correct: attempts.filter((a) => a.correct).length,
    totalMs: attempts.reduce((sum, a) => sum + a.ms, 0),
  };
}

/** Le nombre de séances gardées : de quoi couvrir deux mois sans grossir sans fin. */
export const RUN_HISTORY = 60;

/** Ajoute une séance à l'historique, et oublie les plus anciennes. */
export function rememberRun(history: RunRecord[], record: RunRecord): RunRecord[] {
  return [...history, record].slice(-RUN_HISTORY);
}

export interface NeckTotals {
  /** Positions distinctes déjà travaillées. */
  seen: number;
  attempts: number;
  correct: number;
  accuracy: number;
  /** Temps moyen par note, en millisecondes. */
  meanMs: number;
}

/**
 * Ce que la carte de progression dit, en chiffres.
 *
 * Les trois chiffres portent sur le manche et rien d'autre : « temps moyen par
 * note » veut dire par note nommée, pas par question d'oreille. C'est la même
 * matière que la carte de chaleur, lue en une ligne.
 */
export function neckTotals(progress: ProgressMap): NeckTotals {
  const stats = Object.values(progress);
  const attempts = stats.reduce((sum, s) => sum + s.attempts, 0);
  const correct = stats.reduce((sum, s) => sum + s.correct, 0);
  const totalMs = stats.reduce((sum, s) => sum + s.totalMs, 0);
  return {
    seen: stats.filter((s) => s.attempts > 0).length,
    attempts,
    correct,
    accuracy: attempts ? correct / attempts : 0,
    meanMs: attempts ? Math.round(totalMs / attempts) : 0,
  };
}

// --------------------------------------------------------- spaced repetition

export interface CellStat {
  attempts: number;
  correct: number;
  totalMs: number;
}

export type ProgressMap = Record<string, CellStat>;

export const cellKey = (string: number, fret: number) => `${string}:${fret}`;

export function emptyStat(): CellStat {
  return { attempts: 0, correct: 0, totalMs: 0 };
}

export function recordAttempt(progress: ProgressMap, string: number, fret: number, a: Attempt): ProgressMap {
  const key = cellKey(string, fret);
  const prev = progress[key] ?? emptyStat();
  return {
    ...progress,
    [key]: { attempts: prev.attempts + 1, correct: prev.correct + (a.correct ? 1 : 0), totalMs: prev.totalMs + a.ms },
  };
}

/** Share of attempts answered correctly, or null when never practised. */
export function mastery(stat: CellStat | undefined): number | null {
  if (!stat || stat.attempts === 0) return null;
  return stat.correct / stat.attempts;
}

/**
 * Picks the cells a daily session should drill.
 *
 * Simple spaced repetition: a cell nobody has practised comes first, then the
 * ones with the weakest record, with a nudge towards the slowest. No dates and no
 * intervals — for a five-minute session the ordering is what matters, and keeping
 * it stateless means it cannot drift out of sync with the progress map.
 */
export function prioritise(
  candidates: { string: number; fret: number }[],
  progress: ProgressMap,
  count: number,
  rng: Rng = Math.random,
): { string: number; fret: number }[] {
  const scored = candidates.map((c) => {
    const stat = progress[cellKey(c.string, c.fret)];
    const rate = mastery(stat);
    const meanMs = stat && stat.attempts ? stat.totalMs / stat.attempts : 0;
    // The weights put a cell you always get wrong first, then one you get right
    // half the time, then one you have never seen, then one you know. The 1.6 is
    // what keeps a shaky cell above new material: at 1.4 a half-right cell scored
    // just under an unseen one and a session would keep drifting to new positions
    // instead of attacking the ones it is meant to attack.
    const score = rate === null ? 1 : (1 - rate) * 1.6 + Math.min(meanMs / 4000, 0.25);
    return { c, score, jitter: rng() };
  });
  scored.sort((a, b) => b.score - a.score || a.jitter - b.jitter);
  return scored.slice(0, count).map((s) => s.c);
}

/**
 * How many questions five minutes buys.
 *
 * Thirty is about ten seconds each including the listening, which is the honest
 * pace on a phone. Counting in questions rather than seconds keeps the session
 * finite and finishable, which is the whole point of offering five minutes.
 */
export const DAILY_QUESTIONS = 30;

/**
 * The daily session: name-the-note on the positions the record says are weakest.
 *
 * Naming a note is the one exercise that works on any cell and needs nothing but
 * the neck, so it is what a session can be built from whatever the settings say.
 */
export function dailyRun(
  s: PracticeSettings,
  progress: ProgressMap,
  seed: number,
  count = DAILY_QUESTIONS,
): Question[] {
  const pool = cells(s);
  if (!pool.length) return [];
  const rng = mulberry32(seed);
  // A neck with fewer cells than the session has questions simply asks fewer: on a
  // single string over five frets, repeating the same four notes teaches nothing.
  return prioritise(pool, progress, count, rng).map((c) => nameNoteQuestion(c.string, c.fret, s, rng));
}

export interface HeatCell {
  string: number;
  fret: number;
  /** Share answered correctly, or null when never practised. */
  rate: number | null;
  attempts: number;
}

/** Every cell of the neck with how well it is known, for the heat map. */
export function heat(s: PracticeSettings, progress: ProgressMap): HeatCell[] {
  return cells(s).map((c) => {
    const stat = progress[cellKey(c.string, c.fret)];
    return { string: c.string, fret: c.fret, rate: mastery(stat), attempts: stat?.attempts ?? 0 };
  });
}

/**
 * Les pastilles de la carte de chaleur.
 *
 * Trois niveaux, trois silhouettes : accent cerclé, blanc cerclé, blanc. Les tons
 * `tone` et `chord` ont la même couleur dans la charte, donc sans cet anneau les
 * deux niveaux du bas seraient indiscernables — et une carte de chaleur qui ne se
 * lit qu'en couleur ne se lit pas pour tout le monde.
 */
export function heatMarkers(cells: HeatCell[]): Marker[] {
  return cells.map((cell) => {
    if (cell.rate === null) return { string: cell.string, fret: cell.fret, kind: 'ghost' as MarkerKind };
    const pct = `${Math.round(cell.rate * 100)}`;
    if (cell.rate >= 0.8) return { string: cell.string, fret: cell.fret, kind: 'root' as MarkerKind, label: pct };
    if (cell.rate >= 0.4) {
      return { string: cell.string, fret: cell.fret, kind: 'tone' as MarkerKind, ring: true, label: pct };
    }
    return { string: cell.string, fret: cell.fret, kind: 'chord' as MarkerKind, label: pct };
  });
}

/** Distinct days practised, as YYYY-MM-DD, ending with today. */export function streak(days: string[], today: string): number {
  const set = new Set(days);
  const date = new Date(`${today}T00:00:00Z`);
  let count = 0;
  // A streak survives a day that has not been practised yet, so start from today
  // and allow the first miss to slide back to yesterday.
  for (let guard = 0; guard < 3650; guard++) {
    const iso = date.toISOString().slice(0, 10);
    if (set.has(iso)) {
      count++;
      date.setUTCDate(date.getUTCDate() - 1);
      continue;
    }
    if (count === 0) {
      date.setUTCDate(date.getUTCDate() - 1);
      continue;
    }
    break;
  }
  return count;
}
