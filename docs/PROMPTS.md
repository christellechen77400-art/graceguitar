# Prompts pour Claude Code

À coller dans Claude Code, à la racine du dépôt, un lot à la fois. Après chaque lot : lancer l'app, comparer à la capture indiquée, lancer les tests, fusionner.

## Avant tout
```
Lis CLAUDE.md, docs/PLAN.md et docs/LOTS.md. Ne modifie rien. Résume en 10 lignes ce que tu as compris et liste tes questions.
```

## Lot 0
```
Fais le Lot 0 de docs/LOTS.md : audit du dépôt existant (écris docs/AUDIT.md), renommage GraceGuitar en GCCGuitare, retrait de tout ce qui concerne abonnement, pub et « Soutenir ». Branche lot-0-audit. Montre-moi l'audit avant de supprimer quoi que ce soit.
```

## Lot 5A
```
Fais le Lot 5A. Références visuelles : docs/design/V4-Accueil.png et V4-Moi.png, tokens dans docs/DESIGN.md. Crée src/ui/tokens avec les deux thèmes, la barre d'onglets flottante à 4 entrées, la bascule Jour/Sombre dans Moi (Jour par défaut). Vérifie chaque écran en sombre. Branche lot-5a-navigation.
```

## Lot 5B
```
Fais le Lot 5B (Accueil et widgets). Références : docs/design/V4-Accueil*.png et V4-Progression.png. Utilise ChurchProvider avec FakeProvider pour décider d'afficher « Prochain dimanche ». Les raccourcis suivent l'ordre de docs/PLAN.md §2 et ouvrent Manche avec le paramètre layer. Mode Modifier : ordre, retrait, ajout, rien d'autre.
```

## Lot 5C
```
Fais le Lot 5C (Manche, six couches). Crée src/theory (notes, intervalles, accords, gammes, CAGED, triades) en fonctions pures avec des tests Vitest portés depuis docs/verification/theory_tips.py. Aucune note écrite à la main dans les composants. Références : docs/design/V4-Manche-*.png.
```

## Lot 5D
```
Fais le Lot 5D (ⓘ, tips ampoule, guide). Charge content/tips.fr.json et content/guide.fr.json ; aucun texte de tip dans le code. Références : docs/design/V4-Manche-triades.png, V5-Tip-octave.png, V5-Tips-liste.png, V5-Guide.png, V5-Guide-section.png. Les liens « aide » sont des liens profonds avec « Retour à <écran> ».
```

## Lot 5E
```
Fais le Lot 5E (triades dans une zone). Porte docs/verification/zone_chain.py en src/theory/zoneChain.ts avec les mêmes tests : Gloire à Dieu (La, Fa♯m, Ré, Mi) en zone 5 à 10 doit donner La (6,5,5), Fa♯m (6,7,5), Ré (7,7,5), Mi (9,9,7), déplacement total 9. Écran de référence : docs/design/V5-Triades-zone.png. Ne dis jamais qu'un doigté est confortable.
```

## Lot 5F
```
Fais le Lot 5F (exercices). Données : content/exercises.fr.json. Les questions sont générées par src/theory. Séance de 12 minutes, niveau suivant à 80 % sur les 10 dernières réponses. Résultat visible dans le widget de progression.
```

## Lot 5G
```
Fais le Lot 5G (saisie des accords, toutes les inversions, Dimanche manuel). Références : docs/design/V6-Saisie.png, V6-Inversions.png, V5-Triades-zone.png, V4-Dimanche-vide.png. La saisie accepte des pastilles et le collage d'une grille (« A F#m D E » ou ChordPro). Utilise bestChain pour proposer, puis liste toutes les inversions et recalcule autour de celle choisie. Les chants saisis sont gardés en local. Masque tout ce qui concerne l'app d'église avec FEATURE_CHURCH_SYNC = false. Teste avec les 4 chants de docs/TESTS.md.
```

## Lot 5H
```
Fais le Lot 5H (iPad paysage 1194 x 834). Barre latérale, panneau « Comprendre » ancré. Références : docs/design/V4-iPad-*.png.
```

## Lot 5I (phase B, sans code)
```
Prépare le passage en phase B : parcours docs/LOTS.md, lot 5I. Vérifie l'historique git à la recherche de secrets, liste ce qui doit changer dans Netlify après le transfert du dépôt, et propose la checklist finale. Ne transfère rien toi-même.
```

## Lot 6 (avec le développeur de l'église)
```
Lis docs/SYNC-EGLISE.md. Je te donne le schéma réel de l'app d'église : <coller ici>. Écris SupabaseProvider (ou équivalent) derrière ChurchProvider sans toucher à l'interface, avec cache hors-ligne. Liste ce qui diffère de la proposition.
```
