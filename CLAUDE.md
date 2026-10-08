# GCCGuitare — guide pour Claude Code

GCCGuitare (ancien nom : GraceGuitar) est l'outil de guitare de louange de l'église GCC : le manche, les
triades, les accords, les exercices, les chants du dimanche. Outil **interne** : pas de pub, pas de
paiement, pas de bouton « Soutenir ». Expo + React Native + TypeScript, PWA installable (Netlify) puis
iOS / Android. Interface FR par défaut, bascule EN, notation Do Ré Mi par défaut (ou C D E).

Avant tout nouveau lot, lire `docs/PLAN.md` puis `docs/LOTS.md` (prompts : `docs/PROMPTS.md`, tests :
`docs/TESTS.md`, maquettes : `docs/DESIGN.md`). Un lot à la fois, une branche par lot.

## Commandes
- `npm install` puis `npx expo install --fix` (aligne les versions sur le SDK Expo installé)
- `npx expo start` puis scanner le QR code avec Expo Go
- `npm run typecheck` : vérification TypeScript
- `npm run test:theory` : vérifie tout ce qui est pur (théorie, exercices, chants, migration, compte)
- `npm run gen:sounds` : régénère les échantillons de guitare
- `npm run gen:icon` : régénère l'icône provisoire

## Architecture
- `src/theory/` : moteur pur, sans React. Toute la musique se calcule ici.
  - `notes.ts` : classes de hauteur (0 = C), accordage standard (index 0 = Mi grave), nommage FR/EN, ♯/♭ selon la tonalité
  - `scales.ts`, `chords.ts` : définitions par intervalles
  - `voicings.ts` : génération algorithmique des positions jouables (fenêtre de 4 cases, 4 doigts max, barré = 1 doigt)
  - `caged.ts` : 5 formes ouvertes transposées le long du manche, majeur et mineur
  - `analyzer.ts` : reconnaissance d'accord à partir des cases touchées (gère les renversements type D/F♯)
  - `worship.ts` : accords diatoniques, chiffrage Nashville, progressions courantes, calcul du capo
  - `nashville.ts` : degrés, chiffrage, allers-retours entre un degré et un accord
  - `lessons.ts`, `lessons.fr.ts`, `lessons.en.ts` : les leçons de théorie et leurs traductions
  - `triads.ts` : triades sur 3 cordes voisines, enchaînement qui bouge le moins dans une zone de cases (programmation dynamique), toutes les inversions. Portage de `docs/verification/zone_chain.py`.
- `src/practice/` : les exercices, purs aussi. `engine.ts` (questions, progression, séries),
  `daily.ts` (la séance du jour), `onboarding.ts` (le test de niveau).
- `src/home/` : ce que l'accueil décide — `order.ts` (l'ordre des cartes selon le jour),
  `day.ts`, `stats.ts`, `challenge.ts`, `notion.ts`, `reminder.ts`.
- `src/songs/` : les chants et les sets. `model.ts` (les données), `chordpro.ts` (lecture ChordPro),
  `migrate.ts` (le blob du lot 2 vers la bibliothèque actuelle), `share.ts` (le lien et le QR code),
  `store.tsx` (le fournisseur et sa persistance), `library.ts`, `labels.ts`, `sources.ts`,
  `chordInput.ts` (saisie manuelle des accords d'un chant → grille et triades).
- `src/content/` : lecteurs de `content/tips.*.json` et `content/guide.*.json` (13 tips vérifiés, guide d'utilisation).
- `src/services/` : le compte. `supabase.ts` (le client, ou `null`), `auth.tsx`, `sync.tsx`,
  `merge.ts` (la fusion), `cloudRows.ts` (les colonnes), `chunk.ts`, `password.ts`, `account.ts`,
  `authErrors.ts`.
- `src/components/ui/` : la bibliothèque de composants (`Screen`, `Card`, `ListRow`, `Chip`,
  `Segmented`, `Toggle`, `Stepper`, `Sheet`, `PrimaryButton`, `SecondaryButton`, `ProgressRing`,
  `KeyPicker`, `DisplayPicker`). Un écran se construit avec ça, pas avec des styles écrits sur place.
- `src/components/Fretboard.tsx` : manche SVG défilant horizontalement, marqueurs typés (root, tone, chord, ghost).
- `src/screens/` : les 4 onglets — `HomeScreen` (Accueil), `MancheScreen` (6 couches : Notes, Intervalles,
  Accords, Gammes, CAGED, Triades, via `NeckPanels`, `ChordsPanel`, `TriadsPanel`), `WorshipScreen` (Dimanche),
  `MeScreen` (Moi, `GuideScreens`) — plus `PracticeScreen` et les feuilles (`SpaceSheet`, `AccountSheet`,
  `ChordEntrySheet`, `InversionsSheet`, `OnboardingScreen`, `Run`, `SongStage`) et `songs/`.
- `src/navigation.ts` : les 4 onglets (home, neck, sunday, me), les couches du manche, `NavContext`, le registre de défilement, `TabBarContext`, `RetestContext`.
- `src/i18n/` : `fr.ts` est la référence de type ; `en.ts` doit avoir exactement les mêmes clés
  (les deux listes sont comparées, pas devinées ; les clés de la refonte sont dans `fr.gcc.ts` / `en.gcc.ts`).
- `src/state/settings.tsx` : langue, notation, tonalité, affichage, apparence, son, objectif,
  rappel, main, progression, séances, journal des réponses ; persistés dans AsyncStorage.
- `supabase/` : `schema.sql` et les Edge Functions. Rien là-dedans n'est chargé par l'app.

## Règles
- Aucune logique musicale dans les écrans : l'ajouter dans `src/theory/` et la couvrir dans
  `scripts/theory-check.ts`. Il en va de même pour tout ce qui se calcule — une règle qu'on ne peut
  pas tester sans ouvrir l'app finit par être fausse sans qu'on le sache.
- **Ce que `scripts/theory-check.ts` peut importer ne doit pas atteindre `react-native`.**
  `tsx` ne sait pas transformer `react-native/index.js`. D'où les modules purs séparés des modules
  de plateforme (`home/reminder.ts` et `home/notifications.ts`, `services/merge.ts` et
  `services/sync.tsx`), et les `import type` là où seul un type est nécessaire.
- Toute chaîne visible passe par `t` (i18n). Jamais de texte en dur.
- Ne jamais copier de code, visuels, textes ou tabulations d'une autre app ou d'un recueil d'accords.
  Les voicings sont générés par algorithme, c'est volontaire.
- Palette et typographie dans `src/theme.ts` uniquement. Une couleur écrite ailleurs est un bug :
  elle ne suivra pas le passage en mode sombre. Une information portée par la seule couleur
  (fondamentale, case travaillée, onglet choisi) doit l'être aussi par autre chose — un anneau,
  une graisse, un mot.
- Les paroles de chants ne quittent jamais l'appareil : pas de colonne en base, pas de partage.
- Le compte est optionnel : sans `EXPO_PUBLIC_SUPABASE_URL`, l'app fonctionne seule et les écrans
  de compte sont masqués. Aucune fonction du compte ne lève — chacune rend un résultat.
- `npm run typecheck` et `npm run test:theory` doivent passer avant chaque commit.
- Aucune note, case ou degré écrit à la main dans l'interface : tout vient de `src/theory`. Chaque règle de `content/tips.fr.json` marquée `calcul` a sa vérification dans `scripts/theory-check.ts`.
- Les doigtés « confortables » ne sont pas calculables : ils se jugent à la guitare. Ne pas affirmer qu'un doigté est confortable.
- Icône ⓘ = « Comprendre » (3 niveaux), ampoule = tip, petit lien « Comment ça marche » = lien profond vers le guide.
- `FEATURE_CHURCH_SYNC = false` (`src/config.ts`) tant que le lot 6 n'est pas fait : aucun écran ne mentionne l'app d'église. Ne jamais inventer le schéma de l'app d'église (`docs/SYNC-EGLISE.md`).
- Le préfixe de stockage reste `graceguitar.` : c'est sous ces clés que les données existantes sont rangées.

## Feuille de route
Remplace l'ancienne (abonnement Pro, liaison GCC Louange avant la phase B : abandonnés).
- Phase A : app autonome, saisie manuelle des accords d'un chant (fait : lots 5A–5E, 5G ; exercices 5F et iPad 5H restent à faire).
- Phase B : transfert vers le GitHub de l'église, puis synchro (lot 6, `docs/SYNC-EGLISE.md`).
- Ensuite : lot 7, accordages alternatifs, accordeur micro, icône définitive.

## Git
Une branche par lot, petits commits, PR vers `main`. Ne jamais pousser de secrets : variables d'environnement via Netlify / `.env.local` (non versionné).
