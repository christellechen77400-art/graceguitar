/**
 * La seule chose de l'app qui parle sans qu'on lui demande : le rappel du jeudi.
 *
 * Le fichier est séparé de `reminder.ts` parce qu'il touche à la plateforme, et
 * qu'un module qui importe React Native ne se teste pas en ligne de commande. La
 * règle est d'un côté, l'effet de l'autre.
 */
import { Platform } from 'react-native';

import { clampReminderHour, REMINDER_HOUR, shouldRemind, THURSDAY } from './reminder';

/**
 * Chaque rappel porte son nom.
 *
 * Deux rappels cohabitent — le set du jeudi et la pratique du jour — et chacun
 * doit pouvoir être retiré sans toucher à l'autre : on annule par identifiant, on
 * n'efface jamais tout.
 */
const SUNDAY_SET = 'sunday-set';
const DAILY_PRACTICE = 'daily-practice';

/**
 * Met en place, ou retire, le rappel hebdomadaire.
 *
 * Tout est fait dans un `try` : une permission refusée, un appareil sans
 * notifications, une plateforme qui n'en a pas — aucune de ces choses n'est une
 * raison de faire échouer l'accueil, qui n'a rien demandé.
 */
export async function syncSundayReminder(
  reminders: boolean,
  hasSongs: boolean,
  title: string,
  body: string,
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const notifications = await import('expo-notifications');
    await notifications.cancelScheduledNotificationAsync(SUNDAY_SET);
    if (!shouldRemind(THURSDAY, hasSongs, reminders)) return;

    const granted = await notifications.requestPermissionsAsync();
    if (!granted.granted) return;

    await notifications.scheduleNotificationAsync({
      identifier: SUNDAY_SET,
      content: { title, body },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.WEEKLY,
        // 1 = dimanche, 2 = lundi… 5 = jeudi.
        weekday: THURSDAY + 1,
        hour: REMINDER_HOUR,
        minute: 0,
      },
    });
  } catch {
    // Sans notification, l'app reste une app : elle ne dit simplement rien.
  }
}

/**
 * Met en place, ou retire, le rappel quotidien.
 *
 * Même contrat que le rappel du jeudi : on demande la permission une fois, et
 * tout échec laisse l'app fonctionner. L'heure est bornée par la règle, pas ici.
 */
export async function syncDailyReminder(
  enabled: boolean,
  hour: number,
  title: string,
  body: string,
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const notifications = await import('expo-notifications');
    await notifications.cancelScheduledNotificationAsync(DAILY_PRACTICE);
    if (!enabled) return;

    const granted = await notifications.requestPermissionsAsync();
    if (!granted.granted) return;

    await notifications.scheduleNotificationAsync({
      identifier: DAILY_PRACTICE,
      content: { title, body },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.DAILY,
        hour: clampReminderHour(hour),
        minute: 0,
      },
    });
  } catch {
    // Un rappel qui ne se programme pas ne doit rien casser d'autre.
  }
}
