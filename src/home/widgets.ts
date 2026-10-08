/**
 * Les widgets de l'Accueil : lesquels, et dans quel ordre.
 *
 * L'ordre est celui de la personne, pas celui du jour : elle le règle avec
 * « Modifier » et il survit au rechargement. Il n'y a pas de placement libre,
 * seulement une liste qu'on réordonne, retire et complète.
 *
 * Pur et testé, comme le reste.
 */

export const WIDGET_IDS = ['session', 'shortcuts', 'progress', 'sunday', 'tip', 'notion', 'challenge'] as const;
export type WidgetId = (typeof WIDGET_IDS)[number];

/** Ce que voit quelqu'un qui n'a rien réglé. */
export const DEFAULT_WIDGETS: WidgetId[] = ['session', 'shortcuts', 'progress', 'sunday'];

const isWidget = (value: unknown): value is WidgetId => WIDGET_IDS.includes(value as WidgetId);

/**
 * Une liste lue du stockage, nettoyée : les inconnus et les doublons tombent.
 * Une liste absente donne les widgets par défaut ; une liste vide reste vide,
 * parce que c'est un choix.
 */
export function cleanWidgets(raw: unknown): WidgetId[] {
  if (!Array.isArray(raw)) return [...DEFAULT_WIDGETS];
  const seen = new Set<WidgetId>();
  for (const item of raw) if (isWidget(item)) seen.add(item);
  return [...seen];
}

/**
 * Les widgets à afficher.
 *
 * « Prochain dimanche » n'apparaît que s'il y a un set : sans set, une carte vide
 * en tête d'écran dit que l'app n'a rien à montrer, alors que la personne n'a tout
 * simplement pas de service prévu.
 */
export function visibleWidgets(list: WidgetId[], hasSet: boolean): WidgetId[] {
  return list.filter((id) => id !== 'sunday' || hasSet);
}

/** Monte (-1) ou descend (+1) un widget d'un rang. Au bord, rien ne bouge. */
export function moveWidget(list: WidgetId[], id: WidgetId, direction: -1 | 1): WidgetId[] {
  const from = list.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export const removeWidget = (list: WidgetId[], id: WidgetId): WidgetId[] => list.filter((x) => x !== id);

/** Ajoute à la fin, une seule fois. */
export const addWidget = (list: WidgetId[], id: WidgetId): WidgetId[] => (list.includes(id) ? list : [...list, id]);

/** Ceux qu'on peut encore ajouter. */
export const missingWidgets = (list: WidgetId[]): WidgetId[] => WIDGET_IDS.filter((id) => !list.includes(id));
