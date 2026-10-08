# Lots de développement

Phase A (dépôt perso, app autonome) : lots 0 à 5H. Phase B (église) : lots 5I et 6. Plan de test de la phase A : `TESTS.md`.

Chaque lot = une branche, une PR, des critères d'acceptation vérifiables. Les écrans de référence sont dans `docs/design/` (noms entre parenthèses = cartes du canvas).

## Lot 0 : audit et migration
- Lire le dépôt existant (il vient de GraceGuitar : Expo, React Native, TypeScript). Lister ce qui existe, ce qui est réutilisable, ce qui est à jeter. Écrire `docs/AUDIT.md`.
- Renommer partout GraceGuitar en GCCGuitare (nom d'affichage, `app.json`, titres, README). Retirer tout ce qui parle d'abonnement, de pubs ou de « Soutenir ».
- **Accepté si** : l'app démarre, aucun résultat à `grep -ri "grace\s*guitar\|soutenir\|revenuecat"`, `docs/AUDIT.md` écrit.

## Lot 5A : navigation, thème, tokens
Écrans : toutes les cartes V4. Tâches : barre d'onglets flottante à 4 entrées (pastille glissante), tokens Jour/Sombre, police Newsreader, bascule dans Moi, Jour par défaut, mémorisée.
- **Accepté si** : 4 onglets, aucun écran à 5 onglets, thème Sombre complet sans texte invisible (vérifier chaque écran), préférence conservée après rechargement.

## Lot 5B : Accueil et widgets
Écrans : `V4-Accueil`, `V4-Accueil-set`, `V4-Accueil-sombre`, `V4-Accueil-modifier`, `V4-Progression`.
- Bascule Acoustique / Électrique en haut. Widgets : séance ou dernier exercice, mes raccourcis, ma progression, « Prochain dimanche » (visible seulement si `ChurchProvider.getNextSet()` renvoie un set), astuce du jour (optionnel).
- Mode Modifier : ordre, retrait, ajout. Pas de placement libre.
- Raccourcis numérotés dans l'ordre d'apprentissage ; un appui navigue vers Manche avec le paramètre `layer`.
- **Accepté si** : sans set, aucun widget Dimanche ; avec le fournisseur factice, il apparaît ; l'ordre des widgets survit au rechargement ; un appui sur CAGED ouvre Manche sur la couche CAGED.

## Lot 5C : Manche, six couches
Écrans : `V4-Manche-notes`, `V4-Manche-caged`, `V4-Manche-triades`, `V4-Manche-sombre`.
- Couches : Notes, Intervalles, Accords, Gammes, CAGED, Triades. Les pastilles défilent pour garder la couche active visible.
- Tout est calculé par `src/theory` : notes par case, degrés, formes, renversements.
- **Accepté si** : tests Vitest verts pour chaque couche (voir `docs/verification/theory_tips.py` à porter) ; aucune note codée en dur dans les composants.

## Lot 5D : ⓘ, tips ampoule, guide
Écrans : `V4-Manche-triades` (feuille ⓘ ouverte), `V5-Tip-octave`, `V5-Tips-liste`, `V5-Guide`, `V5-Guide-section`, `V4-Moi`.
- Feuille « Comprendre » à 3 niveaux par couche, bloc « Pour retenir ».
- Bandeau tip ampoule par couche ; feuille de tip avec schéma sur le manche (le tip octave est le modèle) ; liste « Tous les tips » groupée.
- Guide dans Moi ; liens « aide » en 13 px, liens profonds vers `content/guide.fr.json` ; bouton « Retour à <écran d'origine> ».
- Contenus : `content/tips.fr.json`, `content/guide.fr.json`. Version EN en parallèle.
- **Accepté si** : chaque lien d'aide de `guide.fr.json > helpLinks` ouvre la bonne section et ramène à l'écran d'origine ; les 13 tips s'affichent ; aucun texte de tip en dur dans le code.

## Lot 5E : triades dans une zone
Écran : `V5-Triades-zone`. Référence : `docs/verification/zone_chain.py` (à porter en `src/theory/zoneChain.ts`).
- Choix du chant, zone modifiable (− / +), accords de la grille en pastilles, triade de chaque accord dans la zone, phrase de mouvement (« seule la corde de si bouge de 2 cases »).
- Jeux de cordes : sol-si-mi aigu d'abord ; ré-sol-si ensuite. Pour la-ré-sol, avertir quand la zone ne suffit pas.
- **Accepté si** : le test « Gloire à Dieu » (La, Fa♯m, Ré, Mi, zone 5 à 10) donne exactement La (6,5,5), Fa♯m (6,7,5), Ré (7,7,5), Mi (9,9,7), déplacement total 9 ; pour les 12 racines, majeur et mineur, toute fenêtre de 6 cases (case 1 à 14) contient une triade sol-si-mi.

## Lot 5F : exercices et progression
Données : `content/exercises.fr.json`. 6 niveaux, 6 formats. Séance de 12 minutes. Un niveau s'ouvre à 80 % de réussite sur les 10 dernières réponses. Carte de chaleur du manche pour la progression.
- Les exercices sont générés par `src/theory` (jamais de question écrite à la main avec une réponse fixe).
- **Accepté si** : une séance se déroule de bout en bout sur le niveau 1 ; le résultat met à jour le widget de progression ; hors-ligne fonctionne.

## Lot 5G : saisie des accords, toutes les inversions, Dimanche manuel
Écrans : `V6-Saisie`, `V6-Inversions`, `V5-Triades-zone`, `V4-Dimanche-vide`.
- **Saisie** : titre facultatif, tonalité, capo, accords dans l'ordre (pastilles avec degré, suppression, ajout), palette des accords de la tonalité (le 7e degré diminué est grisé tant qu'il n'est pas géré), collage d'une grille (ChordPro ou texte « A F#m D E »). Bouton fixe « Proposer les triades ».
- **Proposition** : `bestChain` (lot 5E) calcule l'enchaînement dans la zone choisie et ouvre `V5-Triades-zone`.
- **Toutes les inversions** : bouton « Toutes les inversions de <accord> » → liste des formes sur sol-si-mi (puis ré-sol-si, la-ré-sol), chacune étiquetée « Proposée / Autre zone » avec ses cases. « Choisir » fixe cette forme pour cet accord et recalcule les autres autour d'elle.
- **Chants enregistrés** : liste locale (les chants saisis restent sur l'appareil). Dimanche affiche cette liste ; l'écran vide propose « Saisir les accords d'un chant ». Les boutons « Relier l'app d'église » sont masqués (`FEATURE_CHURCH_SYNC = false`).
- **Accepté si** : en tapant La, Fa♯m, Ré, Mi (tonalité La, zone 5 à 10), l'app propose La (6,5,5), Fa♯m (6,7,5), Ré (7,7,5), Mi (9,9,7) ; en choisissant une autre inversion pour Ré, les autres accords se recalculent ; un chant saisi est retrouvé après rechargement ; aucune interface ne mentionne l'app d'église.

## Lot 5H : iPad
Écrans : `V4-iPad-Accueil`, `V4-iPad-Accueil-set`, `V4-iPad-Manche`, `V4-iPad-Manche-caged`, `V4-iPad-Dimanche`.
- Barre latérale à la place de la barre d'onglets ; panneau « Comprendre » ancré à droite dans Manche ; grille de chant en grand dans Dimanche.
- **Accepté si** : paysage 1194 × 834 sans défilement horizontal ; mêmes fonctions que l'iPhone.

## Lot 5I : passage en phase B
Pas de code. Liste de contrôle :
1. Tous les tests de `docs/TESTS.md` sont passés sur la PWA.
2. Aucun secret dans l'historique (`git log -p | grep -i "key\|secret\|token"`).
3. Transfert de propriété du dépôt perso vers l'organisation de l'église (Settings > Transfer ownership), renommage `gcc-guitare`, dépôt privé, développeur ajouté en collaborateur.
4. Netlify reconnecté au nouveau dépôt, variables d'environnement vérifiées, PWA redéployée.
5. `FEATURE_CHURCH_SYNC` toujours à `false` jusqu'à la fin du lot 6.

## Lot 6 : synchronisation avec l'app d'église
Voir `SYNC-EGLISE.md`. Authentification partagée (compte unique), lecture des sets, chants, partitions ; sauvegarde de la progression et des préférences.
- **Accepté si** : connexion avec le compte de l'église ; un set créé dans l'app d'église apparaît dans Dimanche et fait apparaître le widget « Prochain dimanche » ; hors-ligne : le dernier set reste lisible.

## Lot 7 : plus tard
Métronome (exercices « avec métronome », 72 BPM de départ), écoute au micro (vérifier la note jouée), piste d'accompagnement, chiffrage Nashville dans la grille, carte de chaleur partagée.
