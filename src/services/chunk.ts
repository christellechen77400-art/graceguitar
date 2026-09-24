/**
 * Le découpage d'une valeur pour le trousseau.
 *
 * `expo-secure-store` refuse une valeur au-delà de 2 048 octets, et une session
 * Supabase les dépasse : le jeton d'accès, le jeton de rafraîchissement et le
 * profil tiennent rarement ensemble dans la limite. On écrit donc la valeur en
 * morceaux, avec leur nombre à part — et on ne rend jamais une session à moitié
 * relue : un morceau manquant vaut une session absente, donc une reconnexion.
 *
 * Pur, donc testable : ni trousseau ni plateforme ici, seulement des chaînes.
 */
export const CHUNK_SIZE = 1800;

export function chunkKey(key: string, index: number): string {
  return `${key}.${index}`;
}

export function chunkCountKey(key: string): string {
  return `${key}.n`;
}

export function chunkValue(value: string, size = CHUNK_SIZE): string[] {
  if (value.length <= size) return [value];
  const parts: string[] = [];
  for (let at = 0; at < value.length; at += size) parts.push(value.slice(at, at + size));
  return parts;
}

/** Le contraire : `null` dès qu'un morceau manque. */
export function joinChunks(parts: readonly (string | null)[]): string | null {
  if (!parts.length) return null;
  if (parts.some((part) => part === null)) return null;
  return parts.join('');
}
