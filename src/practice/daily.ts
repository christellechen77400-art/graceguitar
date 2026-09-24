/**
 * La séance du jour, présentée comme trois exercices d'environ dix questions.
 *
 * Le moteur ne change pas : `dailyRun` choisit toujours ses questions par
 * répétition espacée, en commençant par ce qui est raté. Ce qui change, c'est la
 * façon de le proposer — trois petits blocs plutôt qu'une seule longue série, parce
 * que trois fois dix questions se font dans un entre-deux, et que la troisième
 * série se termine.
 *
 * Les deux derniers exercices tournent d'un jour à l'autre : la carte de
 * progression ne connaît que le manche (c'est la seule chose qu'on enregistre
 * case par case), donc prétendre choisir les autres par répétition espacée serait
 * mentir sur ce que l'app sait. Ils sont choisis par le jour, et l'exercice du
 * manche, lui, suit vraiment ce qui est raté.
 */
import {
  dailyRun,
  ExerciseId,
  ExerciseSection,
  exerciseById,
  makeRun,
  PracticeSettings,
  ProgressMap,
  Question,
} from './engine';

/** Le nombre de questions d'un exercice de la séance. */
export const DAILY_QUESTIONS = 10;

/** Combien de temps compte une question, pour annoncer une durée honnête. */
const SECONDS_PER_QUESTION = 14;

export interface DailyExercise {
  id: ExerciseId;
  section: ExerciseSection;
  questions: Question[];
}

export interface DailySession {
  exercises: DailyExercise[];
  questionCount: number;
  /** Minutes arrondies, jamais zéro : « moins d'une minute » n'aide personne. */
  minutes: number;
}

/**
 * Les exercices qui ne dépendent pas du manche, par terrain.
 *
 * `nameNote` n'y est pas : c'est l'exercice du manche, et il a sa place réservée.
 * Un exercice de chaque liste à chaque séance, pour que la séance couvre deux
 * terrains plutôt que deux fois le même.
 */
export const CHORDS_EAR: ExerciseId[] = ['chordTone', 'earQuality', 'earDegree'];
export const THEORY: ExerciseId[] = ['capoExpress', 'transpose'];

/**
 * Le roulement du jour : un exercice d'accords et d'oreille, un de théorie.
 *
 * Un tirage piloté par la graine — donc par la date — plutôt qu'un `Math.random`,
 * pour que la séance du jour soit la même si on rouvre l'app, et pour qu'elle
 * puisse être testée.
 */
export function rotationFor(seed: number): [ExerciseId, ExerciseId] {
  const n = Math.abs(Math.round(seed));
  return [CHORDS_EAR[n % CHORDS_EAR.length], THEORY[(n + 1) % THEORY.length]];
}

/**
 * La séance du jour : trois exercices, dix questions chacun.
 *
 * Les réglages du joueur gardent la main sur les cordes, la zone et les
 * altérations ; seul le nombre de questions est fixé à dix, parce que c'est la
 * forme de la séance et non une préférence. Un exercice dont les réglages ne
 * permettent aucune question est laissé de côté plutôt que montré vide : une
 * séance de deux exercices vaut mieux qu'un bloc qui ne s'ouvre pas.
 */
export function dailySession(
  settings: PracticeSettings,
  progress: ProgressMap,
  seed: number,
): DailySession {
  const shaped: PracticeSettings = { ...settings, questionCount: DAILY_QUESTIONS };
  const neck: DailyExercise = {
    id: 'nameNote',
    section: exerciseById('nameNote').section,
    questions: dailyRun(shaped, progress, seed, DAILY_QUESTIONS),
  };

  const [a, b] = rotationFor(seed);
  const others = [a, b].map((id, index): DailyExercise => ({
    id,
    section: exerciseById(id).section,
    questions: makeRun(id, shaped, seed + (index + 1) * 977).slice(0, DAILY_QUESTIONS),
  }));

  const exercises = [neck, ...others].filter((e) => e.questions.length > 0);
  const questionCount = exercises.reduce((sum, e) => sum + e.questions.length, 0);
  return {
    exercises,
    questionCount,
    minutes: Math.max(1, Math.round((questionCount * SECONDS_PER_QUESTION) / 60)),
  };
}
