# Kinnor — guide pour Claude Code

Kinnor est une app mobile (iOS / Android, Expo + React Native + TypeScript) de visualisation du manche
de guitare, pensée pour les guitaristes de louange francophones. Interface FR par défaut, bascule EN,
notation des notes au choix (C D E ou Do Ré Mi).

## Commandes
- `npm install` puis `npx expo install --fix` (aligne les versions sur le SDK Expo installé)
- `npx expo start` puis scanner le QR code avec Expo Go
- `npm run typecheck` : vérification TypeScript
- `npm run test:theory` : vérifie le moteur théorique (voicings, analyseur, CAGED, capo)

## Architecture
- `src/theory/` : moteur pur, sans React. Toute la musique se calcule ici.
  - `notes.ts` : classes de hauteur (0 = C), accordage standard (index 0 = Mi grave), nommage FR/EN, ♯/♭ selon la tonalité
  - `scales.ts`, `chords.ts` : définitions par intervalles
  - `voicings.ts` : génération algorithmique des positions jouables (fenêtre de 4 cases, 4 doigts max, barré = 1 doigt)
  - `caged.ts` : 5 formes ouvertes transposées le long du manche, majeur et mineur
  - `analyzer.ts` : reconnaissance d'accord à partir des cases touchées (gère les renversements type D/F♯)
  - `worship.ts` : accords diatoniques, chiffrage Nashville, progressions courantes, calcul du capo
- `src/components/Fretboard.tsx` : manche SVG défilant horizontalement, marqueurs typés (root, tone, chord, ghost)
- `src/screens/` : Louange, Gammes, Accords, CAGED, Analyseur
- `src/i18n/` : `fr.ts` est la référence de type ; `en.ts` doit avoir exactement les mêmes clés
- `src/state/settings.tsx` : langue, notation, tonalité, mode d'affichage, persistés dans AsyncStorage

## Règles
- Aucune logique musicale dans les écrans : l'ajouter dans `src/theory/` et la couvrir dans `scripts/theory-check.ts`.
- Toute chaîne visible passe par `t` (i18n). Jamais de texte en dur.
- Ne jamais copier de code, visuels, textes ou tablatures d'une autre app ou d'un recueil d'accords.
  Les voicings sont générés par algorithme, c'est volontaire.
- Palette et typographie dans `src/theme.ts` uniquement.

## Feuille de route
1. Son : jouer la note ou l'accord au toucher (expo-audio + échantillons libres de droits ou synthèse).
2. Abonnement Pro via RevenueCat (essai 7 jours), écran paywall, restauration d'achats.
3. Grilles de chants : import ChordPro, transposition, suggestion de capo automatique.
4. Liaison avec la plateforme GCC Louange (récupérer la tonalité et la grille d'un chant planifié).
5. Mode gaucher et accordages alternatifs (Drop D, DADGAD, demi-ton plus bas).
6. Icône, écran de lancement, fiches App Store FR/EN, politique de confidentialité.
