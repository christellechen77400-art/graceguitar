# GCCGuitare : plan de développement

Dernière mise à jour : 8 octobre 2026. Auteure du produit : Christelle (coordination GCC, guitariste de louange).

## 1. Ce qu'on construit
Une app de guitare pour les musiciens de louange de GCC. Deux usages :
1. **Avant le dimanche** : on reçoit les chants (tonalité, capo, grille, partition). L'app propose pour chaque accord les triades qui tiennent dans **une même zone du manche** (ex. cases 5 à 10), la pentatonique et la forme CAGED pour retrouver la mélodie et faire des licks.
2. **Le reste du temps** : apprendre le manche, les intervalles, les accords, les gammes, les triades, avec explications, tips mnémotechniques et exercices progressifs.

Public : guitaristes de louange qui passent de l'acoustique à l'électrique, ou débutent l'un des deux. Méthode : « progresser de séance de louange en séance de louange ».

## 2. Décisions validées
| Sujet | Décision |
| --- | --- |
| Nom | **GCCGuitare** (ancien nom GraceGuitar). Orthographe à confirmer : « GCCGuitare » ou « GCC Guitare » |
| Statut | Outil interne de l'église. Pas de pub, pas de paiement, pas de « Soutenir ». Version publique payante éventuelle plus tard |
| Compte | **Compte unique** partagé avec l'app d'église, synchronisé |
| Navigation | 4 onglets : Accueil, Manche, Dimanche, Moi |
| Accueil | Widgets réorganisables et masquables : séance ou dernier exercice, mes raccourcis, ma progression ; « Prochain dimanche » seulement si un set arrive de l'app d'église |
| Raccourcis | Boutons numérotés dans l'ordre d'apprentissage ; un appui ouvre Manche sur la bonne couche. Acoustique : Notes, Accords, Intervalles, Rythmes, Capo, Gammes. Électrique : Notes, Intervalles, Accords, Gammes, CAGED, Triades |
| Manche | 6 couches : Notes, Intervalles, Accords, Gammes, CAGED, Triades. Autres outils : Capo, Rythmes, Métronome, Glossaire |
| Triades | Choix d'une **zone de jeu** (fenêtre de 6 cases) ; enchaînement calculé par programmation dynamique ; 3 renversements |
| Explications | Icône ⓘ partout, feuille « Comprendre » à 3 niveaux (En bref, Sur le manche, À l'oreille) + « Pour retenir » |
| Tips | Icône ampoule, 13 tips vérifiés (`content/tips.fr.json`) |
| Guide | Dans Moi ; liens profonds « Comment ça marche » depuis Accueil, Manche, Dimanche |
| Thème | Jour par défaut, Sombre au choix. Ivoire #F5EFE3, brun #A85608, serif Newsreader |
| Appareils | iPhone portrait, iPad paysage (barre latérale), d'abord en PWA sur l'écran d'accueil |
| Progression | Résumé sur l'Accueil, détail dans un écran dédié ; pas de doublon dans Moi |

## 2 bis. Deux phases
- **Phase A, autonome (dépôt sur le compte GitHub perso)** : l'app marche seule. On saisit les accords d'un chant à la suite, l'app propose les meilleures triades dans une zone, et on peut voir toutes les inversions si la proposition ne convient pas. Tout l'app est testée ainsi, sans app d'église. « Relier l'app d'église » reste **masqué** (drapeau `FEATURE_CHURCH_SYNC = false`).
- **Phase B, avec l'église** : quand tout est validé, on transfère le dépôt au compte GitHub de l'église (transfert de propriété, historique conservé), on reconnecte Netlify, puis on construit la synchro (lot 6).

Saisie des accords (écrans `V6-Saisie`, `V6-Inversions`) : titre facultatif, tonalité, capo, accords à la suite par pastilles ou collage d'une grille, accords de la tonalité en palette. « Proposer les triades » calcule l'enchaînement ; « Toutes les inversions de <accord> » liste toutes les formes sur les trois cordes (dans la zone ou non) et recalcule l'enchaînement autour de celle qu'on choisit.

## 3. Architecture
```
src/
  theory/        notes, intervalles, accords, gammes, CAGED, triades, zoneChain (calculé, testé)
  content/       chargeurs des JSON de /content (tips, exercices, guide), FR/EN
  features/
    accueil/     widgets + mode Modifier
    manche/      couches, fretboard SVG, feuille ⓘ, bandeau tip
    dimanche/    sets, chants, mode scène, ajout manuel / ChordPro
    moi/         réglages, guide, tips, progression
    exercices/   moteur d'exercices, séances, niveaux
  church/        ChurchProvider (interface), FakeProvider, SupabaseProvider (à valider)
  state/         préférences, progression, widgets (stockage local puis synchro)
  ui/            tokens, thème Jour/Sombre, composants
```
- **Théorie** : fonctions pures, aucune dépendance à React. Tests Vitest portés depuis `docs/verification/`.
- **Fournisseur de données église** : une interface `ChurchProvider` (sets, chants, partitions, utilisateur). Un fournisseur factice permet de tout développer avant la synchro.
- **Hors-ligne d'abord** : tout fonctionne sans réseau ; la synchro ajoute les sets et sauvegarde la progression.
- **PWA** : déployée sur Netlify à chaque fusion dans `main` (voir `ACCES-IMMEDIAT.md`).

## 4. Découpage en lots
Voir `LOTS.md`. Ordre :
0. Audit du dépôt existant et migration de nom
1. 5A Navigation 4 onglets, thème, tokens
2. 5B Accueil et widgets
3. 5C Manche et ses 6 couches
4. 5D Explications ⓘ, tips ampoule, guide
5. 5E Triades dans une zone
6. 5F Exercices et progression
7. 5G Saisie des accords, toutes les inversions, Dimanche manuel
8. 5H iPad (barre latérale)
9. 5I Passage en phase B : transfert au compte de l'église
10. 6 Synchro avec l'app d'église (compte unique)
11. 7 Métronome, écoute au micro, piste d'accompagnement

## 5. Ce qui reste à décider (humain)
- Orthographe finale du nom, et domaine ou sous-domaine (outil interne : sous-domaine de l'app d'église ?).
- Schéma exact des sets et chants côté app d'église : à fournir par le développeur (voir `SYNC-EGLISE.md`).
- Rôles : qui voit quoi (tous les musiciens, ou seulement l'équipe de louange) ?
- Tips visibles dès le premier lancement, ou après quelques séances (proposition : dès le premier lancement, un seul tip par écran).
