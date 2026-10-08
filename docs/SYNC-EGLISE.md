# Synchronisation avec l'app d'église

> **Statut : proposition.** Ce document décrit ce dont GCCGuitare a besoin. Le schéma réel de l'app d'église n'est pas connu de Claude : le développeur de l'app d'église doit confirmer ou corriger chaque point marqué **[À VALIDER]**.

## 1. Principe
- **Compte unique** : une personne se connecte une fois, avec le compte de l'église, dans les deux apps.
- **GCCGuitare lit** les sets, chants et partitions ; **elle écrit** seulement la progression et les préférences de la personne.
- **Hors-ligne d'abord** : le dernier set reçu reste lisible sans réseau.
- Tant que la synchro n'existe pas, `FakeProvider` fournit des données d'exemple (voir lot 5G).

## 2. Authentification **[À VALIDER]**
Hypothèse la plus simple : les deux apps partagent le même fournisseur d'authentification (même projet, mêmes utilisateurs).
- Question au développeur : quel fournisseur (Supabase, Firebase, maison) ? Peut-on réutiliser la session (même domaine ou sous-domaine) ?
- Si les domaines sont différents : connexion par lien magique ou code, même compte.
- Les secrets ne sont jamais dans le dépôt. Variables d'environnement : voir `ACCES-IMMEDIAT.md`.

## 3. Données lues (interface `ChurchProvider`)
```ts
interface ChurchProvider {
  getCurrentUser(): Promise<{ id: string; displayName: string; roles: string[] } | null>;
  getNextSet(): Promise<ChurchSet | null>;          // null = pas de widget « Prochain dimanche »
  listSets(range: { from: string; to: string }): Promise<ChurchSet[]>;
  getSong(id: string): Promise<ChurchSong>;
}
type ChurchSet = { id: string; date: string; title: string; songs: { order: number; songId: string }[]; updatedAt: string };
type ChurchSong = {
  id: string; title: string;
  key: string;               // tonalité de jeu du set, ex. "A"
  capo: number | null;       // ex. 2
  bpm: number | null;
  chart: string;             // grille au format ChordPro
  scoreUrl: string | null;   // partition (PDF ou image)
  updatedAt: string;
};
```
Questions au développeur **[À VALIDER]** :
1. Où sont les sets et les chants (tables, API) ? Noms exacts des champs ?
2. La tonalité est-elle propre au set (le chant est transposé pour le dimanche) ou propre au chant ?
3. Les grilles existent-elles déjà en ChordPro ? Sinon, quel format (texte libre, JSON par section) ?
4. Les partitions : fichiers hébergés où ? URL signées ? Durée de validité ?
5. Qui a le droit de lire quoi (rôles : équipe de louange seulement, ou tout membre) ?

## 4. Données écrites par GCCGuitare
| Donnée | Contenu | Clé |
| --- | --- | --- |
| Préférences | langue, thème, guitare (acoustique ou électrique), ordre des widgets | utilisateur |
| Progression | réponses aux exercices, niveau, série de jours | utilisateur |
| Zone choisie | zone de jeu par chant (cases début et fin) | utilisateur + chant |
| Chants ajoutés à la main | titre, tonalité, capo, grille ChordPro | utilisateur |

Règle de conflit : la dernière modification gagne, sauf pour la progression (on fusionne : on garde le maximum de réussite par niveau et on additionne les réponses).

## 5. Flux
1. Ouverture de l'app : session vérifiée → `getNextSet()` → affichage ou non du widget « Prochain dimanche ».
2. Onglet Dimanche : liste des sets à venir, chants du set choisi, état « prêt » par chant (accords, triades, mélodie).
3. Un chant s'ouvre dans Manche > Triades avec sa grille, sa tonalité et son capo, la zone mémorisée si elle existe.
4. Hors-ligne : lecture du cache local (dernier set, chants, grilles). Les partitions déjà ouvertes sont mises en cache.
5. Retour en ligne : envoi des écritures en attente.

## 6. Sécurité
- Accès en lecture limité aux rôles définis par l'église **[À VALIDER]**.
- Aucune donnée personnelle de l'app d'église hors prénom, rôle et sets.
- Partitions : jamais copiées dans le dépôt.

## 7. Ordre de travail
1. Développeur : répondre aux questions des §2 et §3, exposer un accès en lecture de test.
2. Claude Code : écrire `SupabaseProvider` (ou équivalent) derrière `ChurchProvider`, sans toucher à l'interface.
3. Test croisé : créer un set dans l'app d'église, vérifier qu'il apparaît dans Dimanche.
