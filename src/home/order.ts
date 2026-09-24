/**
 * L'ordre des cartes de l'accueil, selon le jour.
 *
 * Il change parce que la semaine d'un musicien de louange change : du lundi au
 * mercredi on travaille, le jeudi on prépare, et le dimanche on joue. Le jour où
 * l'on joue, le set passe devant tout le reste et la séance devient courte — ce
 * n'est pas le moment d'apprendre le manche par cœur.
 *
 * Pur et testé : c'est une règle, pas une mise en page.
 */

export type HomeSection =
  | 'todaySession'
  | 'sundaySet'
  | 'notionOfDay'
  | 'progress'
  | 'weeklyChallenge';

/**
 * L'ordre des cartes.
 *
 * `hasSet` est faux quand il n'y a aucun set pour dimanche : la carte n'a alors
 * rien à montrer, et une carte vide en première position est le meilleur moyen de
 * donner l'impression que l'app ne sert à rien.
 */
export function homeSections(dayOfWeek: number, hasSet: boolean): HomeSection[] {
  // From Thursday to Sunday the set comes first: those are the days you prepare
  // it, and the day you play it. Monday to Wednesday, the week's work leads.
  const setFirst = dayOfWeek === 0 || dayOfWeek >= 4;
  const head: HomeSection[] = setFirst
    ? ['sundaySet', 'todaySession', 'notionOfDay']
    : ['todaySession', 'notionOfDay', 'sundaySet'];

  // Without a set to prepare, the card drops to the end: the others always have
  // something to say, and an empty card in first place reads as an empty app.
  const ordered: HomeSection[] = hasSet ? head : [...head.filter((s) => s !== 'sundaySet'), 'sundaySet'];
  return [...ordered, 'progress', 'weeklyChallenge'];
}

/** Vrai le dimanche : la séance est alors courte, et le set se joue en grand. */
export const isSundayMode = (dayOfWeek: number) => dayOfWeek === 0;

/**
 * Le nombre de questions d'une séance du dimanche.
 *
 * La moitié d'une séance ordinaire : le dimanche on joue, on ne travaille pas, et
 * une séance trop longue serait abandonnée au milieu.
 */
export const SUNDAY_QUESTIONS = 6;
