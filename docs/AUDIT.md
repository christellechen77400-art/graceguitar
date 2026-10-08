# Audit de l'existant (lot 0)

Ce qui a été gardé, changé ou retiré de GraceGuitar pour faire GCCGuitare.

## Gardé tel quel
- `src/theory/` (notes, gammes, accords, voicings, CAGED, analyseur, Nashville, leçons) et ses vérifications.
- `src/practice/` (moteur d'exercices, séance du jour, test de niveau).
- `src/songs/` (modèle, ChordPro, partage par lien, bibliothèque) et le magasin de chants.
- `src/components/ui/`, `Fretboard`, thème clair/sombre, audio.
- Compte Supabase : optionnel, masqué sans variables d'environnement (inchangé).

## Ajouté
- `src/theory/triads.ts` : triades par zone, enchaînement minimal, inversions (portage de `docs/verification/zone_chain.py`).
- `src/songs/chordInput.ts` : saisie manuelle des accords d'un chant.
- Navigation à 4 onglets, couches du manche, accueil à cartes modifiables, « Comprendre » à 3 niveaux, tips (ampoule), guide dans « Moi ».
- PWA : `public/` (manifeste, icônes, `index.html`) et `netlify.toml`.

## Retiré
- Abonnement Pro / RevenueCat, paywall, « Soutenir », liens politique de confidentialité / conditions.
- Mention de l'app d'église tant que `FEATURE_CHURCH_SYNC = false` (rangée de sources, ligne « Église »).
- Ancien ordre de cartes de l'accueil par jour de la semaine (`src/home/order.ts` reste testé mais n'est plus utilisé par l'écran).

## Renommé
- Nom, `slug`, schéma d'URL `gccguitare://`, identifiants `com.renoo.gccguitare`.
- Le préfixe de stockage reste `graceguitar.` : changer de préfixe ferait perdre les données déjà enregistrées.

## Pas encore fait
- **Lot 5F** : nouveau système d'exercices à 6 niveaux (`content/exercises.fr.json`). Le moteur d'exercices existant est réutilisé.
- **Lot 5H** : barre latérale iPad et panneau « Comprendre » ancré. La mise en page s'adapte, sans disposition iPad dédiée.
- **Lots 5I, 6 (synchro église, phase B), 7.**

## Non vérifié
Les doigtés calculés respectent les règles musicales (notes de l'accord, écart ≤ 2 cases) mais n'ont pas été essayés sur une vraie guitare.
