/**
 * Ce qu'on accepte comme mot de passe, et ce qu'on en dit.
 *
 * Deux règles seulement : huit caractères, et une adresse qui a l'air d'une
 * adresse. Le reste est un avis, pas une condition — un mot de passe long mais
 * simple reste accepté, et l'app se contente de dire qu'il est faible plutôt que
 * de refuser.
 *
 * C'est ici, pur, et pas dans l'écran, parce que c'est une règle qu'on veut
 * pouvoir relire et vérifier sans ouvrir l'app.
 */

/** En dessous, Supabase refuse de son côté : autant le dire avant. */
export const MIN_PASSWORD = 8;

export type PasswordStrength = 'weak' | 'medium' | 'strong';

/**
 * L'avis donné sur un mot de passe.
 *
 * Un mot de passe trop court est faible sans discussion. Au-delà, la longueur
 * compte plus que l'alphabet : douze caractères simples valent mieux que huit
 * caractères compliqués, et c'est ce que le barème reflète.
 */
export function passwordStrength(password: string): PasswordStrength {
  if (password.length < MIN_PASSWORD) return 'weak';
  let score = 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score >= 4) return 'strong';
  if (score >= 2) return 'medium';
  return 'weak';
}

/**
 * Une adresse plausible.
 *
 * Volontairement large : il ne s'agit pas de valider une adresse — seul l'envoi
 * d'un e-mail le fera — mais d'attraper une faute de frappe avant d'essayer.
 */
export function isEmail(text: string): boolean {
  const trimmed = text.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}
