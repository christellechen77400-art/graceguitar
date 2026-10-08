# GCCGuitare : consignes pour Claude Code

Lis `docs/PLAN.md` puis `docs/LOTS.md` avant toute modification. Travaille un lot à la fois.

## Stack
Expo + React Native + TypeScript. Cible : PWA installable sur l'écran d'accueil (iPhone, iPad), puis iOS/Android. FR par défaut, bascule EN. Tests : Vitest pour `src/theory`.

## Interface
- 4 onglets : **Accueil, Manche, Dimanche, Moi**. Pas d'autre navigation principale.
- Jour par défaut, mode Sombre au choix. Jamais de couleur en dur : tokens de `docs/DESIGN.md`.
- Titres en Newsreader (serif), texte en police système.
- iPhone portrait et iPad paysage (barre latérale à la place de la barre d'onglets).
- Icône **ⓘ** = « Comprendre » (3 niveaux). Icône **ampoule** = tip. Petit lien « Comment ça marche » = lien profond vers le guide.
- Pas de publicité, pas de paiement, pas de bouton « Soutenir ».

## Théorie musicale
- Cordes numérotées 0 = mi grave à 5 = mi aigu, accordage standard.
- Aucune note, case ou degré écrit à la main dans l'interface : tout vient de `src/theory`.
- Chaque règle de `content/tips.fr.json` marquée `calcul` a un test dans `src/theory/__tests__`, porté depuis `docs/verification/`.
- Les doigtés « confortables » ne sont pas calculables : ils se jugent à la guitare. Ne pas affirmer qu'un doigté est confortable.

## Phase A / phase B
Tant que le lot 6 n'est pas fait, `FEATURE_CHURCH_SYNC = false` : aucun écran ne mentionne l'app d'église. L'app marche seule (saisie des accords). Plan de test : `docs/TESTS.md`.

## Données de l'église
- Le contrat est dans `docs/SYNC-EGLISE.md`. Ne jamais inventer le schéma de l'app d'église : utiliser l'adaptateur `ChurchProvider` et un fournisseur factice tant que le développeur n'a pas validé.
- Lecture seule côté GCCGuitare pour les sets, chants et partitions.

## Git
Une branche par lot (`lot-5a-navigation`, ...), petits commits, PR vers `main`. Ne jamais pousser de secrets : variables d'environnement via Netlify / `.env.local` (non versionné).
