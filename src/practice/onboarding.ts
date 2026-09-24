/**
 * The five questions asked the first time the app opens, and what they decide.
 *
 * They are asked to set the starting point of the exercises, not to judge anyone:
 * a beginner should not open on the whole neck with the accidentals on. Nothing
 * here is a test — every question can be skipped, and the answers only choose
 * defaults that the settings screen can change afterwards.
 */
import { PracticeSettings } from './engine';

export type OnboardingId = 'experience' | 'noteNames' | 'barre' | 'diatonic' | 'capo';

export interface OnboardingQuestion {
  id: OnboardingId;
  /**
   * How much each answer says about the player, 0 to 2, in the order the answers
   * are offered. Choices are read from the i18n data, so the count has to match.
   */
  weights: number[];
}

export const ONBOARDING: OnboardingQuestion[] = [
  { id: 'experience', weights: [0, 1, 2] },
  { id: 'noteNames', weights: [0, 1, 2] },
  { id: 'barre', weights: [0, 1, 2] },
  { id: 'diatonic', weights: [0, 1, 2] },
  { id: 'capo', weights: [0, 1, 2] },
];

export type Level = 1 | 2 | 3;

/** Highest score the questions can produce, used to place the thresholds. */
export const MAX_SCORE = ONBOARDING.reduce((sum, q) => sum + Math.max(...q.weights), 0);

/**
 * The level, 1 to 3, from the answers.
 *
 * A skipped question counts as nothing known, so skipping everything lands on
 * level 1 — the gentlest start, which is the safe way to be wrong. The thresholds
 * are a third and two thirds of the total.
 */
export function levelFrom(answers: (number | null)[]): Level {
  const score = ONBOARDING.reduce((sum, q, i) => {
    const answer = answers[i];
    return answer === null || answer === undefined ? sum : sum + (q.weights[answer] ?? 0);
  }, 0);
  if (score >= (MAX_SCORE * 2) / 3) return 3;
  if (score >= MAX_SCORE / 3) return 2;
  return 1;
}

/**
 * The settings a level starts on.
 *
 * Level 1 stays on one string inside the first five frets with the naturals only:
 * one thing to look at. Level 3 opens the neck and stops asking about white keys,
 * because a player who knows the neck wants the accidentals drilled too.
 */
export function practiceFor(level: Level): PracticeSettings {
  switch (level) {
    case 1:
      return {
        strings: [5],
        zoneFrom: 0,
        zoneTo: 5,
        accidentals: false,
        questionCount: 5,
        timed: false,
      };
    case 2:
      return {
        strings: [4, 5],
        zoneFrom: 0,
        zoneTo: 5,
        accidentals: false,
        questionCount: 10,
        timed: false,
      };
    case 3:
      return {
        strings: [0, 1, 2, 3, 4, 5],
        zoneFrom: 0,
        zoneTo: 12,
        accidentals: true,
        questionCount: 15,
        timed: false,
      };
  }
}
