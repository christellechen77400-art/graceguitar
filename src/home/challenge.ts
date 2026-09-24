/**
 * Le défi de la semaine.
 *
 * Un exercice, dix questions, et le meilleur temps pour le finir. Le défi change
 * le lundi et pas le matin : une graine tirée du jour obligerait à le relire
 * chaque jour, et « de la semaine » ne voudrait plus rien dire.
 */
import { EXERCISES, ExerciseId, RunRecord } from '../practice/engine';
import { seedOf, startOfWeek } from './day';

export const CHALLENGE_QUESTIONS = 10;

export interface Challenge {
  exercise: ExerciseId;
  questions: number;
}

/**
 * Les exercices qui posent plusieurs questions d'affilée.
 *
 * « Toutes les mêmes notes » n'en pose qu'une : il n'y aurait pas de temps à
 * comparer, et un défi d'une seconde ne se gagne pas, il se constate.
 */
export const CHALLENGE_EXERCISES: ExerciseId[] = EXERCISES.filter((e) => e.multi).map((e) => e.id);

export function challengeOfWeek(today: string): Challenge {
  const seed = seedOf(startOfWeek(today));
  return {
    exercise: CHALLENGE_EXERCISES[seed % CHALLENGE_EXERCISES.length],
    questions: CHALLENGE_QUESTIONS,
  };
}

/**
 * Le meilleur temps sur le défi, ou null tant qu'il n'a pas été couru en entier.
 *
 * Une séance ne compte que si elle ne portait que cet exercice : un temps pris au
 * milieu d'une séance du jour n'a pas été fait dans les mêmes conditions, et le
 * comparer serait comparer deux choses différentes.
 */
export function bestTime(runs: RunRecord[], challenge: Challenge): number | null {
  const times = runs
    .filter(
      (run) =>
        run.exercises.length === 1 &&
        run.exercises[0] === challenge.exercise &&
        run.questions >= challenge.questions,
    )
    .map((run) => run.totalMs);
  return times.length ? Math.min(...times) : null;
}
