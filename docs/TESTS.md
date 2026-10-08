# Plan de test de la phase A (sans app d'église)

À faire sur la PWA installée sur iPhone (portrait) puis sur iPad (paysage). Cocher chaque ligne.

## Jeu de chants d'essai (à saisir à la main)
| Chant | Tonalité | Capo | Accords |
| --- | --- | --- | --- |
| Gloire à Dieu | La | 2 | La, Fa♯m, Ré, Mi |
| Tu es fidèle | Ré | 0 | Ré, Sol, La, Si m |
| Ma force | Mi | 4 | Mi, La, Si, Do♯ m |
| Béni soit ton nom | Sol | 0 | Sol, Ré, Mi m, Do |

## Résultats attendus
- **Gloire à Dieu, zone cases 5 à 10 (cordes sol-si-mi)** : La (6,5,5) 1er renversement ; Fa♯m (6,7,5) 2e renversement ; Ré (7,7,5) fondamentale ; Mi (9,9,7) fondamentale. Déplacement total 9.
- **Les trois autres chants, zone cases 5 à 10, cordes sol-si-mi** (cases données de la corde de sol, de si, de mi aigu ; calculées par `docs/verification/zone_chain.py`) :

| Chant | Accord 1 | Accord 2 | Accord 3 | Accord 4 | Déplacement total |
| --- | --- | --- | --- | --- | --- |
| Tu es fidèle | Ré (7,7,5) | Sol (7,8,7) | La (6,5,5) | Si m (7,7,7) | 14 |
| Ma force | Mi (9,9,7) | La (9,10,9) | Si (8,7,7) | Do♯ m (9,9,9) | 14 |
| Béni soit ton nom | Sol (7,8,7) | Ré (7,7,5) | Mi m (9,8,7) | Do (9,8,8) | 9 |

Si l'app donne une autre forme à déplacement total égal, ce n'est pas une erreur : vérifier que les cases restent dans la zone et que chaque forme contient bien tonique, tierce et quinte.

## Parcours
- [ ] Accueil : sans set, pas de widget « Prochain dimanche » ; raccourcis dans l'ordre d'apprentissage ; un appui ouvre Manche sur la bonne couche.
- [ ] Mode Modifier : réordonner, retirer, ajouter un widget ; l'ordre reste après rechargement.
- [ ] Manche : les 6 couches s'affichent ; la couche active reste visible dans les pastilles.
- [ ] ⓘ : feuille « Comprendre » à 3 niveaux sur chaque couche, avec « Pour retenir ».
- [ ] Ampoule : le bandeau tip s'affiche sur chaque couche ; « Tous les tips » liste les 13.
- [ ] Saisie : taper les accords d'un chant, retirer un accord, en ajouter un, coller « A F#m D E ».
- [ ] « Proposer les triades » : enchaînement dans la zone ; modifier la zone avec − et +.
- [ ] « Toutes les inversions » : voir les formes, en choisir une autre, vérifier le recalcul.
- [ ] Exercices : une séance complète au niveau 1 ; la progression se met à jour.
- [ ] Guide : chaque lien « Comment ça marche » ouvre la bonne section et ramène à l'écran d'origine.
- [ ] Moi : Jour par défaut, bascule Sombre, guitare, langue ; aucun bouton « Soutenir ».
- [ ] Mode Sombre : aucun texte invisible sur aucun écran.
- [ ] Hors-ligne : avion activé, l'app et les chants saisis restent utilisables.
- [ ] iPad paysage : barre latérale, panneau « Comprendre » ancré.

## À juger à la guitare (ce que le calcul ne dit pas)
- Les doigtés proposés sont-ils confortables pour toi ? Noter ceux qui ne le sont pas : ils servent à régler la limite d'écart (aujourd'hui 2 cases).
- La zone proposée est-elle bien celle où tu aimes jouer ce chant ?
