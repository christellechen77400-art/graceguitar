# GraceGuitar — guide pour Claude Code

GraceGuitar (« Guitare de louange ») est une app mobile (iOS / Android, Expo + React Native +
TypeScript) pour les guitaristes de louange : le manche, les accords, les exercices, la théorie,
les chants du dimanche, et un compte pour retrouver tout ça ailleurs. Interface FR par défaut,
bascule EN, notation des notes au choix (C D E ou Do Ré Mi).

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
- `src/practice/` : les exercices, purs aussi. `engine.ts` (questions, progression, séries),
  `daily.ts` (la séance du jour), `onboarding.ts` (le test de niveau).
- `src/home/` : ce que l'accueil décide — `order.ts` (l'ordre des cartes selon le jour),
  `day.ts`, `stats.ts`, `challenge.ts`, `notion.ts`, `reminder.ts`.
- `src/songs/` : les chants et les sets. `model.ts` (les données), `chordpro.ts` (lecture ChordPro),
  `migrate.ts` (le blob du lot 2 vers la bibliothèque actuelle), `share.ts` (le lien et le QR code),
  `store.tsx` (le fournisseur et sa persistance), `library.ts`, `labels.ts`, `sources.ts`.
- `src/services/` : le compte. `supabase.ts` (le client, ou `null`), `auth.tsx`, `sync.tsx`,
  `merge.ts` (la fusion), `cloudRows.ts` (les colonnes), `chunk.ts`, `password.ts`, `account.ts`,
  `authErrors.ts`.
- `src/components/ui/` : la bibliothèque de composants (`Screen`, `Card`, `ListRow`, `Chip`,
  `Segmented`, `Toggle`, `Stepper`, `Sheet`, `PrimaryButton`, `SecondaryButton`, `ProgressRing`,
  `KeyPicker`, `DisplayPicker`). Un écran se construit avec ça, pas avec des styles écrits sur place.
- `src/components/Fretboard.tsx` : manche SVG défilant horizontalement, marqueurs typés (root, tone, chord, ghost).
- `src/screens/` : Aujourd'hui, Louange, Accords, Manche, Exercices, plus les feuilles
  (`SpaceSheet`, `AccountSheet`, `OnboardingScreen`, `Run`, `SongStage`) et `songs/`.
- `src/navigation.ts` : les onglets, le registre de défilement, `TabBarContext`, `RetestContext`.
- `src/i18n/` : `fr.ts` est la référence de type ; `en.ts` doit avoir exactement les mêmes clés
  (499 aujourd'hui — les deux listes sont comparées, pas devinées).
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

## Feuille de route
1. Abonnement Pro via RevenueCat (essai 7 jours), écran paywall, restauration d'achats.
2. Liaison avec la plateforme GCC Louange (récupérer la tonalité et la grille d'un chant planifié).
3. Mode gaucher et accordages alternatifs (Drop D, DADGAD, demi-ton plus bas).
4. Accordeur branché sur le micro.
5. Recevoir un texte ChordPro par la feuille de partage (demande un development build).
6. Icône définitive, écran de lancement, fiches App Store FR/EN, politique de confidentialité.

## Plan GCCGuitare (refonte 4 onglets) — à lire avant tout nouveau lot

Le produit s'appelle désormais **GCCGuitare** (outil interne à l'église, sans pub ni paiement). La refonte est décrite dans `docs/` :
- `docs/PLAN.md` (décisions, phases A/B), `docs/LOTS.md` (lots 0, 5A–5I, 6, 7), `docs/PROMPTS.md` (un prompt par lot), `docs/TESTS.md` (4 chants de test et enchaînements attendus), `docs/DESIGN.md` + `docs/design/*.png` (maquettes), `docs/SYNC-EGLISE.md` (synchro, phase B), `docs/ACCES-IMMEDIAT.md` (PWA).
- Contenus : `content/tips.fr.json`, `content/exercises.fr.json`, `content/guide.fr.json`.
- Vérifications de référence : `docs/verification/*.py`.
- Phase A : app autonome, saisie manuelle des accords d'un chant, `FEATURE_CHURCH_SYNC=false`. Phase B : transfert vers le GitHub de l'église, puis synchro.
- **La « Feuille de route » ci-dessus est remplacée** : plus d'abonnement Pro / RevenueCat ni de paywall (point 1), plus de liaison GCC Louange avant la phase B (point 2). Le lot 0 (`docs/LOTS.md`) audite l'existant et décide quoi garder.
- Les fichiers `docs/CLAUDE-PLAN-GCCGUITARE.md` et `docs/README-PLAN.md` sont les versions rédigées pour la refonte ; le lot 0 les fusionne dans `CLAUDE.md` et `README.md`.
