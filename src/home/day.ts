/**
 * Le jour de l'accueil : comment on le salue, et la semaine qu'il termine.
 *
 * Rien de React ici. La salutation est une règle — à partir de 18 h on dit
 * « Bonsoir » — et la semaine est un calcul de dates ; les deux se testent, donc
 * les deux vivent ici plutôt que dans l'écran.
 *
 * Toutes les dates sont manipulées en UTC, comme partout ailleurs dans l'app :
 * un jour est un jour, pas un instant.
 */

export type DayPart = 'morning' | 'afternoon' | 'evening';

/**
 * Le moment de la journée.
 *
 * Le français n'a que deux mots là où l'anglais en a trois : « Bonjour » tient de
 * 5 h à 18 h, et le dictionnaire se charge de dire lequel des deux on emploie. Ce
 * qui est décidé ici, c'est la frontière.
 */
export function dayPart(hour: number): DayPart {
  // Avant 5 h, on est encore dans la soirée de la veille : « Bonsoir » plutôt
  // qu'un « Bonjour » à trois heures du matin.
  if (hour >= 18 || hour < 5) return 'evening';
  return hour < 12 ? 'morning' : 'afternoon';
}

/**
 * Au-delà de cette longueur, le prénom n'est plus une salutation.
 *
 * Un prénom de quinze lettres ne tient pas dans la ligne avec « Bonjour » sans
 * repousser la pastille de série hors de l'écran : on salue alors sans lui.
 */
export const MAX_GREETING_NAME = 14;

/** Le prénom à saluer, ou rien du tout. */
export function greetingName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > MAX_GREETING_NAME ? '' : trimmed;
}

/** Une graine stable tirée d'un texte — une date, le plus souvent. */
export function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Le lundi de la semaine d'une date. La semaine d'un musicien commence lundi. */
export function startOfWeek(iso: string): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return iso;
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

/** Les sept jours de la semaine, du lundi au dimanche. */
export function weekDays(iso: string): string[] {
  const monday = new Date(`${startOfWeek(iso)}T00:00:00.000Z`);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

export interface WeekDay {
  iso: string;
  /** Un jour où une séance a été faite. */
  done: boolean;
  /** Le jour même : c'est celui qui porte un cercle, fait ou pas. */
  today: boolean;
}

/**
 * La semaine en ligne : sept pastilles, du lundi au dimanche.
 *
 * Les jours qui viennent sont là aussi, éteints : une semaine tronquée au jour
 * courant ne montrerait pas qu'il reste de la place avant dimanche.
 */
export function weekStrip(practiceDays: string[], today: string): WeekDay[] {
  return weekDays(today).map((iso) => ({
    iso,
    done: practiceDays.includes(iso),
    today: iso === today,
  }));
}
