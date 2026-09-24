/**
 * La fusion du téléphone et du compte.
 *
 * Les deux côtés ont raison chacun chez soi : on joue dans le métro, on ajoute un
 * chant sur l'ordinateur, et à la reconnexion il faut bien décider. La règle est
 * la même partout — **le plus récent gagne, par identifiant** — et elle est ici,
 * pure, pour qu'on puisse la tester sans serveur et sans téléphone.
 *
 * Ce qui s'ajoute au lieu de se remplacer — les réponses aux exercices — ne se
 * fusionne pas : on les rejoue dans l'ordre pour retrouver la progression. C'est
 * la même fonction que celle qui a servi à l'écrire, donc les deux côtés
 * recomptent pareil.
 */
import { Attempt, ProgressMap, Question, recordAttempt } from '../practice/engine';
import { Song, WorshipSet } from '../songs/model';
import { Library } from '../songs/migrate';

/** Un enregistrement daté : la seule chose dont la fusion a besoin. */
interface Stamped {
  updatedAt?: string;
}

const stampOf = (row: Stamped): string => row.updatedAt ?? '';

/**
 * L'union de deux listes, par identifiant.
 *
 * À identifiant égal, la plus récente des deux versions gagne — et à dates
 * égales, celle du téléphone, parce que c'est celle que la personne a sous les
 * yeux. Les rangs locaux ne bougent pas : l'ordre d'une liste est un choix, pas
 * une donnée à fusionner.
 */
export function mergeById<T extends { id: string } & Stamped>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>();
  for (const row of local) byId.set(row.id, row);
  for (const row of remote) {
    const mine = byId.get(row.id);
    if (!mine || stampOf(row) > stampOf(mine)) byId.set(row.id, row);
  }
  // L'ordre local d'abord, ce qui n'existe qu'en face ensuite.
  const localIds = local.map((row) => row.id);
  const remoteOnly = remote.filter((row) => !localIds.includes(row.id)).map((row) => row.id);
  return [...localIds, ...remoteOnly].map((id) => byId.get(id)!).filter(Boolean);
}

export function mergeLibrary(local: Library, remote: Library): Library {
  return {
    songs: mergeById<Song>(local.songs, remote.songs),
    sets: mergeById<WorshipSet>(local.sets, remote.sets),
  };
}

/** Une réponse enregistrée, telle qu'elle voyage. */
export interface ProgressEvent {
  id: string;
  exerciseId: string;
  string: number;
  fret: number;
  correct: boolean;
  ms: number;
  /** ISO : c'est aussi ce qui donne les jours pratiqués. */
  createdAt: string;
}

/**
 * La progression, reconstruite à partir des réponses.
 *
 * On rejoue tout plutôt que d'additionner des totaux : deux appareils qui ont
 * compté chacun de leur côté ne s'additionnent pas correctement, alors que deux
 * listes de réponses se relisent dans l'ordre et donnent le même résultat partout.
 */
export function foldEvents(events: readonly ProgressEvent[], from: ProgressMap = {}): ProgressMap {
  const ordered = [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return ordered.reduce(
    (progress, event) =>
      recordAttempt(progress, event.string, event.fret, { correct: event.correct, ms: event.ms }),
    from,
  );
}

/** Les jours où l'on a joué, déduits des réponses. */
export function daysFromEvents(events: readonly ProgressEvent[]): string[] {
  return [...new Set(events.map((event) => event.createdAt.slice(0, 10)))].sort();
}

/**
 * Les réponses d'une séance, prêtes à monter.
 *
 * L'identifiant est fabriqué à partir de l'instant de la séance et du rang de la
 * question, et non tiré au hasard : rejouer la même séance écrit les mêmes lignes.
 * Le serveur les ignore alors en double, et un envoi interrompu peut être refait
 * sans compter deux fois.
 *
 * Seules les questions de manche sont gardées : les autres ne portent pas de
 * position, et une réponse d'oreille n'a rien à faire dans une carte de chaleur.
 */
export function eventsOfRun(asked: readonly Question[], attempts: readonly Attempt[], at: Date): ProgressEvent[] {
  const iso = at.toISOString();
  return asked.flatMap((question, index) => {
    const attempt = attempts[index];
    if (!attempt || question.exercise !== 'nameNote') return [];
    return [
      {
        id: `${iso}#${index}`,
        exerciseId: question.exercise,
        string: question.string,
        fret: question.fret,
        correct: attempt.correct,
        ms: attempt.ms,
        createdAt: iso,
      },
    ];
  });
}

/**
 * Combien de réponses on garde sur le téléphone.
 *
 * Cinq mille : de quoi tenir des années à dix questions par jour. Au-delà, les
 * plus anciennes partent — elles ont déjà été comptées dans la progression, qui
 * ne dépend pas d'elles pour s'afficher.
 */
export const EVENT_HISTORY = 5000;

export function rememberEvents(
  events: readonly ProgressEvent[],
  added: readonly ProgressEvent[],
  cap = EVENT_HISTORY,
): ProgressEvent[] {
  return [...events, ...added].slice(-cap);
}

/**
 * Les jours pratiqués : ceux du téléphone, ceux du compte, et rien de perdu.
 *
 * Une union et non un remplacement : un jour où l'on n'a fait que de l'oreille ne
 * laisse aucune réponse à la position près, et il compte pourtant dans la série.
 */
export function unionDays(local: readonly string[], remote: readonly string[]): string[] {
  return [...new Set([...local, ...remote])].sort();
}

/**
 * Les deux journaux réunis, sans doublon.
 *
 * L'identifiant d'une réponse est déterministe : la même réponse arrivée des deux
 * côtés n'est qu'une seule ligne. Le local est écrit en second, et gagne donc en
 * cas de désaccord — c'est la même réponse, mais c'est la sienne.
 */
export function unionEvents(
  local: readonly ProgressEvent[],
  remote: readonly ProgressEvent[],
): ProgressEvent[] {
  const byId = new Map<string, ProgressEvent>();
  for (const event of remote) byId.set(event.id, event);
  for (const event of local) byId.set(event.id, event);
  return [...byId.values()];
}

/**
 * La progression après un échange avec le compte.
 *
 * Elle est **rejouée** à partir des deux journaux réunis, jamais additionnée : une
 * réponse comptée sur le téléphone et retrouvée dans le compte ne doit pas compter
 * deux fois, et rejouer la liste entière donne le même résultat des deux côtés.
 *
 * Reste le cas des cases travaillées **avant** que le journal existe : leurs
 * réponses n'ont jamais été écrites, et pourtant leur total est là. On les garde
 * telles quelles — mais seulement celles qu'aucune réponse ne touche, sinon on
 * compterait deux fois ce que le journal contient déjà.
 */
export function rebaseProgress(
  local: ProgressMap,
  localEvents: readonly ProgressEvent[],
  remoteEvents: readonly ProgressEvent[],
): ProgressMap {
  const all = unionEvents(localEvents, remoteEvents);
  const touched = new Set(all.map((event) => `${event.string}:${event.fret}`));
  const carried: ProgressMap = {};
  for (const [key, cell] of Object.entries(local)) {
    if (!touched.has(key)) carried[key] = cell;
  }
  return foldEvents(all, carried);
}
