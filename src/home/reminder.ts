/**
 * Le rappel du jeudi soir : la règle, et la date qu'elle vise.
 *
 * Le set de dimanche se prépare le jeudi ; c'est aussi le jour où on l'oublie. Une
 * notification locale le rappelle à 19 h, et seulement si le set est encore vide —
 * un rappel qui tombe alors que le travail est fait est un rappel qu'on finit par
 * couper.
 *
 * Ce fichier ne programme rien : il dit *s'il faut* et *quand*. La programmation
 * elle-même est dans `notifications.ts`, qui a besoin de la plateforme ; la règle,
 * elle, se teste, donc elle vit ici — sans React Native, sans expo-notifications.
 */

/** Jeudi, en convention `Date.getDay()` : dimanche vaut 0. */
export const THURSDAY = 4;

/** 19 h : après le repas, avant la répétition. */
export const REMINDER_HOUR = 19;

/**
 * Faut-il rappeler ?
 *
 * Pur, donc testable : c'est une règle — le bon jour, un set encore vide, des
 * rappels activés — et pas une ligne d'écran.
 */
export function shouldRemind(dayOfWeek: number, hasSongs: boolean, reminders: boolean): boolean {
  return reminders && dayOfWeek === THURSDAY && !hasSongs;
}

/** Le prochain jeudi à 19 h, heure locale. */
export function nextThursdayEvening(now = new Date()): Date {
  const date = new Date(now);
  date.setHours(REMINDER_HOUR, 0, 0, 0);
  // Le jeudi de cette semaine s'il est encore à venir, celui de la semaine
  // prochaine sinon — y compris le jeudi soir même, où 19 h est passé.
  date.setDate(date.getDate() + ((THURSDAY - date.getDay() + 7) % 7));
  if (date.getTime() <= now.getTime()) date.setDate(date.getDate() + 7);
  return date;
}
