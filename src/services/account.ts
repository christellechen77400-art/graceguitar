/**
 * L'en-tête du compte : deux lettres, et rien de plus.
 *
 * Les initiales viennent du prénom quand il y en a un, et de l'adresse sinon —
 * un compte créé avec Apple n'a parfois pas de prénom avant la première
 * connexion, et un cercle vide se lit comme un bug.
 */
export function initialsOf(firstName: string, email: string): string {
  const name = firstName.trim();
  if (name) {
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
    return words[0].slice(0, 2).toUpperCase();
  }
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}
