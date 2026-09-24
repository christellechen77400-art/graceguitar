/**
 * Ce qu'on dit quand la connexion échoue.
 *
 * Supabase répond en anglais technique — « Invalid login credentials », « User
 * already registered ». Personne ne lit ça. Chaque cas connu devient une clé de
 * traduction ; le reste tombe dans « inconnu », qui vaut mieux qu'un message faux.
 */
export type AuthErrorKey =
  | 'inUse'
  | 'badCredentials'
  | 'weakPassword'
  | 'offline'
  | 'rateLimited'
  | 'unknown';

/** Le peu de l'erreur qu'on lit : un code, un statut, un texte. */
export interface AuthErrorLike {
  message?: string;
  status?: number;
  code?: string;
}

export function authErrorKey(error: unknown): AuthErrorKey {
  const e = (error ?? {}) as AuthErrorLike;
  const text = `${e.message ?? ''} ${e.code ?? ''}`.toLowerCase();
  const status = e.status ?? 0;

  // Le réseau d'abord : c'est le seul cas où réessayer suffit.
  if (status === 0 || /network|fetch|timeout|offline/.test(text)) return 'offline';
  if (status === 429 || /rate limit|too many/.test(text)) return 'rateLimited';
  if (/already|exists|registered/.test(text)) return 'inUse';
  if (/password/.test(text) && /(short|weak|least|length)/.test(text)) return 'weakPassword';
  if (/invalid login|invalid credentials|wrong password|not confirmed/.test(text)) return 'badCredentials';
  return 'unknown';
}
