/**
 * Les minutes de la semaine.
 *
 * Le temps ne se déduit pas de la carte de progression : une position sait
 * combien de fois on l'a touchée, pas quand. Il vient donc de l'historique des
 * séances, qui porte la date de chacune.
 */
import { RunRecord } from '../practice/engine';
import { startOfWeek } from './day';

/**
 * Les minutes pratiquées depuis lundi, arrondies.
 *
 * Les séances postérieures à aujourd'hui sont ignorées : une date à venir dans
 * l'historique serait un bug ailleurs, et la compter ici ne ferait que le cacher.
 */
export function weekMinutes(runs: RunRecord[], today: string): number {
  const monday = startOfWeek(today);
  const ms = runs
    .filter((run) => run.day >= monday && run.day <= today)
    .reduce((sum, run) => sum + run.totalMs, 0);
  return Math.round(ms / 60000);
}
