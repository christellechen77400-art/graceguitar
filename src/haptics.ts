/**
 * Le retour haptique, en un seul endroit.
 *
 * Une vibration est une phrase, et elle se répète : la même pour tous les choix,
 * une autre pour une bonne réponse, une troisième pour une erreur. Les écrans
 * n'appellent donc pas `expo-haptics` directement — ils disent *ce qui vient de se
 * passer*, et le jour où le dosage change, il change ici.
 *
 * Rien de tout cela n'existe sur le web, et rien n'est jamais indispensable : une
 * vibration qui échoue ne doit pas faire échouer l'action qu'elle accompagne.
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const canBuzz = Platform.OS !== 'web';

/** Un choix : une tonalité, une case du clavier, un onglet. */
export function tapFeedback(): void {
  if (canBuzz) Haptics.selectionAsync().catch(() => {});
}

/** Une bonne réponse. */
export function rightFeedback(): void {
  if (canBuzz) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Une mauvaise réponse. */
export function wrongFeedback(): void {
  if (canBuzz) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
