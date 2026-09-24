/**
 * Ce qu'on emporte en quittant : la progression et la bibliothèque, en JSON.
 *
 * Le format est écrit ici et nulle part ailleurs, pour qu'un export d'aujourd'hui
 * reste lisible par une version d'après-demain : un numéro de format, une date, et
 * le reste tel quel. Rien de ce qui sort n'est calculé — un export qu'on ne peut
 * pas relire à la main ne sert à rien.
 */
import { PracticeSettings, ProgressMap, RunRecord } from '../practice/engine';
import { Song, WorshipSet } from '../songs/model';

/** La version du format, pas celle de l'app : elle ne change que si la forme change. */
export const EXPORT_FORMAT = 1;

export interface ExportInput {
  firstName: string;
  level: number;
  goalMinutes: number;
  hand: string;
  practice: PracticeSettings;
  progress: ProgressMap;
  practiceDays: string[];
  runs: RunRecord[];
  songs: Song[];
  sets: WorshipSet[];
}

export function exportJson(input: ExportInput, now: Date): string {
  return JSON.stringify(
    {
      app: 'GraceGuitar',
      format: EXPORT_FORMAT,
      exportedAt: now.toISOString(),
      ...input,
    },
    null,
    2,
  );
}

/** Le nom du fichier : la date du jour, pour deux exports qui ne s'écrasent pas. */
export function exportName(now: Date): string {
  return `graceguitar-${now.toISOString().slice(0, 10)}.json`;
}
