# GraceGuitar, lot 3 : nom, navigation, charte, accueil, bibliothèque de chants, espace personnel et compte

À placer à la racine du projet. Claude Code : lis ce fichier en entier, puis exécute-le étape par étape, dans l'ordre de la section 13, avec un commit par étape.

## 0. Prérequis et règles

- Le lot 2 (son, onglet Exercices, questionnaire d'accueil, théorie, set du dimanche) doit être terminé. S'il ne l'est pas, termine-le d'abord.
- Règles de CLAUDE.md inchangées :
  - logique musicale dans `src/theory/` ;
  - toutes les chaînes dans `src/i18n/`, en FR et en EN ;
  - tests dans `scripts/theory-check.ts`.
- Ce lot ne modifie aucun calcul musical existant. Il ajoute la logique des chants et des sets, testée comme le reste.
- Tout doit rester compatible Expo Go : expo-blur, react-native-reanimated, expo-haptics, expo-secure-store, expo-apple-authentication, expo-font, @expo-google-fonts/newsreader, react-native-qrcode-svg et @supabase/supabase-js le sont.
- À la fin de chaque étape, `npm run typecheck` et `npm run test:theory` doivent passer sans erreur.
- Mets à jour CLAUDE.md et le README avec le nouveau nom et les nouvelles règles.

## 1. Nouveau nom : GraceGuitar

- Nom affiché : **GraceGuitar**. Sous-titre : « Guitare de louange » (EN : « Worship guitar »).
- app.json :
  - `name` : GraceGuitar ;
  - `slug` : graceguitar ;
  - `scheme` : graceguitar ;
  - identifiants iOS et Android : `com.renoo.graceguitar`.
- Remplace « Kinnor » partout : textes, i18n, README, CLAUDE.md, titres, clés de stockage.
- Migration des données : au premier lancement, lis les anciennes clés AsyncStorage `kinnor.*`, recopie-les sous `graceguitar.*`, puis supprime les anciennes. Écris un test pour cette migration.
- Icône provisoire : un « G » en Newsreader, marron #A85608 sur fond ivoire #F5EFE3.

## 2. Navigation

### Onglets (5, dans cet ordre)

| Onglet | EN | Rôle |
|---|---|---|
| Aujourd'hui | Today | Accueil ouvert au lancement : salutation, séance du jour, set, progression |
| Louange | Worship | Mes chants, mes sets, tonalité, accords diatoniques, capo |
| Accords | Chords | Dictionnaire, positions, analyseur « Nommer un accord » |
| Manche | Fretboard | Gammes, CAGED et notes du manche |
| Exercices | Practice | Exercices, théorie, accordeur |

- Les anciens onglets Gammes et CAGED deviennent deux modes de l'onglet Manche. CAGED n'est pas supprimé.
- En haut de l'onglet Manche, un contrôle segmenté : Gammes, CAGED, Notes.
- Dans le mode Gammes, un interrupteur « Afficher les formes CAGED » surligne la forme choisie par-dessus la gamme.
- Dans l'onglet Accords, chaque position affiche sa forme CAGED quand elle en est une (par exemple « Forme E, case 3 »).
- L'espace personnel n'est pas un onglet. Il s'ouvre depuis un bouton rond (initiales, ou icône personne) en haut à droite de l'accueil, dans une feuille modale plein écran.

### Barre d'onglets flottante

- **Position et taille :** capsule à 16 des bords latéraux et 28 du bas (plus la zone de sécurité), hauteur 64, rayon 32, marge interne 6.
- **Fond en verre :** `BlurView` d'expo-blur (intensité 60), surcouche ivoire #FFFCF6 à 70 % (sombre : #2B2620 à 70 %), liseré de 0,5 blanc à 85 % (sombre : blanc à 12 %), ombre douce (0, 10, 30, noir à 12 %).
- **Pastille active :**
  - pleine, #221C14 en clair et #F3ECE0 en sombre ;
  - hauteur 52, rayon 26, largeur d'un onglet ;
  - elle glisse d'un onglet à l'autre avec `withSpring` de react-native-reanimated (damping 16, stiffness 180, mass 0,9).
- **Chaque onglet :** icône au trait de 22 (épaisseur 1,8) et libellé de 11 semi-gras. Couleur inversée sur la pastille, texte secondaire sinon, avec une transition de 200 ms.
- **Icônes** (react-native-svg, dans `src/components/icons.tsx`) : soleil, note de musique, grille d'accord, manche, cible.
- **Comportements :**
  - retour haptique léger au changement d'onglet (`Haptics.selectionAsync`) ;
  - toucher l'onglet actif remonte en haut de la page ;
  - si « Réduire les animations » est activé, la pastille se déplace sans ressort, en 150 ms ;
  - la barre se cache pendant une séance d'exercice et quand le clavier est ouvert.
- **Accessibilité :** chaque onglet a `accessibilityRole="tab"`, `accessibilityState={{ selected }}` et un libellé.
- Chaque écran réserve 130 en bas. Le contenu défile sous la barre, visible à travers le verre.

## 3. Charte graphique

Fond ivoire, titres en serif, accent marron, beaucoup d'air, peu d'éléments par écran.

### Couleurs (`src/theme.ts`)

Deux palettes, choisies par `useColorScheme()`, avec un réglage Apparence : Automatique, Clair, Sombre.

| Jeton | Clair | Sombre |
|---|---|---|
| background | #F5EFE3 | #12100D |
| card | #FFFCF6 | #1E1A16 |
| label | #221C14 | #F3ECE0 |
| secondary | #75695A | #A89F92 |
| separator | #E6DCCB | #3A332B |
| fill (pastilles, boutons secondaires) | #EFE6D6 | #2B2620 |
| accent | #A85608 | #F2A33A |
| onAccent | #FFFFFF | #1E1A16 |
| iconBackground | #F1E8D8 | #2B2620 |
| iconForeground | #5A4A33 | #D8CFC2 |
| destructive | #B3261E | #FF8A80 |

Couleurs du manche, identiques dans les deux modes :

| Élément | Couleur |
|---|---|
| Palissandre | #2E2119 |
| Frettes | #BFB6A8 |
| Sillet | #F3EEE4 |
| Cordes | #E6DED0 |
| Repères | #5A4636 |
| Fondamentale | #F2A33A, texte #221C14 |
| Autres notes | #FFFFFF, texte #221C14 |
| Notes fantômes | contour blanc à 45 % |

Règles :
- **Une seule couleur d'accent,** réservée à l'action principale, à la sélection, aux liens et à la progression.
- **Icônes de liste neutres.** Pas de couleur différente par ligne, pas de badges colorés décoratifs.
- **Jamais la couleur seule** pour distinguer deux états : ajouter une coche, un contour ou un libellé.
- **Contraste du texte :** 4,5:1 minimum dans les deux modes (le marron sur l'ivoire est à environ 4,6 à 5:1).

### Typographie

- Titres : **Newsreader**, via `@expo-google-fonts/newsreader` et `useFonts`. Graisses 400 et 500, et l'italique 400.
- Tout le reste : police du système.
- Pendant le chargement de la police, garder l'écran de démarrage (expo-splash-screen).

| Style | Police | Taille | Graisse | Usage |
|---|---|---|---|---|
| greeting / largeTitle | Newsreader | 38 | 500 | Salutation de l'accueil, titre de chaque onglet |
| section | Newsreader | 23 | 500 | Titres au-dessus des cartes |
| cardTitle | Newsreader | 22 | 500 | Titre d'une carte importante (Séance du jour, set) |
| chordName | Newsreader | 34 | 500 | Nom d'accord dans une carte |
| notion | Newsreader italique | 34 | 400 | Nom de la notion du jour |
| headline | Système | 17 | semibold | Titres de lignes importantes |
| body | Système | 17 | regular | Lignes de liste |
| subhead | Système | 15 | regular | Textes secondaires |
| caption | Système | 13 | regular | Sous-titres, notes |
| tab | Système | 11 | semibold | Libellés d'onglets |

Chiffres tabulaires pour les scores, les temps et les compteurs.

### Formes et espacements

- **Marges :** cartes à 16 des bords latéraux, 26 entre sections, 16 à l'intérieur des cartes. Ne pas tasser : mieux vaut faire défiler que serrer.
- **Rayons :** cartes 18, cases et petits boutons 10 à 12, pastilles 18, gros boutons 14.
- **Hauteurs :** gros bouton 50, bouton secondaire 44, ligne de liste 44 (56 avec sous-titre), zone tactile minimale 44.
- **Ombres :** aucune sur les cartes. Uniquement sur les éléments flottants (barre d'onglets, feuilles).

### Composants à créer (`src/components/ui/`)

- `Screen` : fond, défilement, en-tête, 130 de marge basse.
- `LargeTitle` et `SectionHeader` : titre en serif, avec une action texte en accent à droite en option.
- `Card`.
- `ListRow` : icône carrée neutre de 30 (rayon 8), titre, sous-titre, valeur à droite, chevron, séparateur qui commence après l'icône.
- `Chip` : sélectionnée remplie en accent.
- `Segmented` : contrôle segmenté iOS.
- `Toggle`, `Stepper`, `PrimaryButton` (accent, texte onAccent), `SecondaryButton` (fill, texte label).
- `Sheet` : poignée, titre centré, Annuler à gauche.
- `ProgressRing`.
- `FloatingTabBar`.

Remplace tous les anciens styles des écrans par ces composants.

## 4. Questionnaire d'accueil (mise à jour du lot 2)

- Ajoute en première question « Comment t'appelles-tu ? » (EN : « What's your first name? »), avec un seul champ, facultatif, et le bouton Passer.
- Le prénom est enregistré localement, puis envoyé dans le profil si l'utilisateur crée un compte. S'il crée un compte en ayant déjà donné son prénom, le champ Prénom de l'inscription est prérempli.
- Ajoute une question « Quelles formes d'accords préfères-tu jouer avec un capo ? » : sélection multiple parmi G, C, D, A, E, avec G, C et D cochées par défaut. Elle sert à conseiller le capo.

## 5. Accueil « Aujourd'hui »

### En-tête

- Date du jour en texte secondaire (« Jeudi 24 septembre »).
- **Salutation** en Newsreader 38 : « Bonjour Christelle » de 5 h à 18 h, « Bonsoir Christelle » ensuite. En anglais : Good morning, Good afternoon, Good evening.
  - Sans prénom, ou si le prénom dépasse 14 caractères : « Bonjour » seul.
- À droite de la date : la pastille de série (flamme + « 5 jours ») et le bouton rond de l'espace personnel.
- Sous la salutation : la semaine en ligne compacte, sept pastilles L à D.
  - Jour pratiqué : rempli en accent, avec une coche.
  - Aujourd'hui : cercle en accent.
  - Autres jours : contour fin.

### Ordre des cartes selon le jour

L'ordre s'adapte au jour (fonction pure `homeSections(dayOfWeek, hasSet)` dans `src/home/order.ts`, testée) :

| Position | Lundi à mercredi | Jeudi à samedi | Dimanche |
|---|---|---|---|
| 1 | Séance du jour | Set du dimanche | Set du jour, « prêt à jouer » |
| 2 | Notion du jour | Séance du jour | Séance du jour (courte) |
| 3 | Set du dimanche | Notion du jour | Notion du jour |
| 4 | Ta progression | Ta progression | Ta progression |
| 5 | Défi de la semaine | Défi de la semaine | Défi de la semaine |

### Contenu des cartes

- **Séance du jour :**
  - anneau de progression, titre en serif, durée estimée ;
  - les 3 exercices choisis par la répétition espacée, ceux qui sont faits étant barrés et cochés ;
  - bouton Commencer, ou Continuer si la séance est entamée.
- **Set du dimanche :**
  - date et nom du culte, et la source (« Saisi à la main », « Importé », « Reçu de [prénom] », « GCC Planning ») ;
  - chaque chant avec une pastille de tonalité, le capo conseillé, et la mention « Tonalité seulement » si sa grille n'est pas saisie ;
  - bouton « S'entraîner sur ce set ».
  - **Set vide :** une simple ligne « Ajoute les chants de dimanche », pas une grande carte. Elle passe en première position du jeudi au samedi.
  - Notification locale le jeudi à 19 h si le set de dimanche est vide et que les rappels sont activés.
- **Mode dimanche :** pour chaque chant, la tonalité, le capo et la grille en accords (ou « Accords probables dans cette tonalité » si seule la tonalité est connue). Toucher un chant ouvre sa fiche en plein écran, avec un texte large et l'écran qui reste allumé (expo-keep-awake).
- **Notion du jour :** nom en Newsreader italique, explication en 2 lignes, schéma d'accord, bouton d'écoute, bouton Voir la leçon.
- **Ta progression :**
  - carte de chaleur du manche (6 cordes × 12 cases), l'opacité de l'accent indiquant la maîtrise ;
  - légende ;
  - minutes de la semaine, taux de réussite, temps moyen par note.
  - Avant la première séance, elle est remplacée par « Ta progression apparaîtra après ta première séance ».
- **Défi de la semaine :** une ligne avec l'énoncé et le meilleur temps.
- L'accordeur quitte l'accueil : il est dans l'onglet Exercices et dans l'espace personnel.

## 6. Louange : mes chants et mes sets

### Modèle de données (`src/songs/`, logique pure testée)

```ts
type Section = { name: 'intro' | 'verse' | 'chorus' | 'bridge' | 'tag' | 'outro' | string; bars: string[] };
// bars en chiffrage Nashville ("1", "4", "6m", "5/7", "2m7"), convertis en accords à l'affichage

type Song = {
  id: string;
  title: string;
  defaultKey: number;           // classe de hauteur 0-11
  mode: 'major' | 'minor';
  sections?: Section[];         // absent = « Tonalité seulement »
  tempo?: number;
  notes?: string;               // dynamique, consignes
  referenceUrl?: string;        // YouTube, Spotify
  source: 'manual' | 'chordpro' | 'shared' | 'gcc';
  updatedAt: string;
};

type SetSong = { songId: string; key: number; capo: number; order: number };
type WorshipSet = { id: string; date: string; serviceName?: string; songs: SetSong[]; source: string };
```

### Fonctions (`src/songs/`)

- `nashvilleToChord(degree, key, mode)` et `chordToNashville(chord, key)`, y compris les accords avec basse (« 5/7 » en G donne D/F♯).
- `suggestCapo(key, preferredShapes)` : renvoie le capo le plus bas (0 à 7) dont la tonalité de formes est dans les formes préférées.
- `parseChordPro(text)` :
  - extrait le titre, la tonalité, les sections et les accords, et les convertit en chiffrage Nashville ;
  - les paroles ne sont conservées que sur l'appareil, dans un champ séparé, et ne sont jamais partagées.
- `probableChords(key, mode)` : les accords diatoniques, les plus fréquents en louange en premier (1, 4, 5, 6m, puis 2m, 3m).
- Tests pour chacune de ces fonctions.

### Écrans

- **Onglet Louange :**
  - titre « Louange » ;
  - section « Prochain set », la carte du prochain set ;
  - section « Mes sets », la liste avec un bouton Nouveau set ;
  - section « Mes chants », les 5 derniers et un lien Tout voir ;
  - enfin l'outil de tonalité existant (pastilles, accords de la tonalité, capo).
- **Nouveau set (feuille) :**
  - date (par défaut le dimanche suivant), nom du culte facultatif ;
  - liste des chants, réordonnables par glisser ;
  - bouton Ajouter un chant.
- **Ajouter un chant (feuille) :**
  - un champ de recherche : dès les premières lettres, les chants de la bibliothèque sont proposés, et un toucher les ajoute avec leur tonalité habituelle ;
  - si le titre est nouveau, la **saisie éclair** : titre, tonalité en pastilles, majeur ou mineur, bouton Ajouter ;
  - le capo conseillé s'affiche tout de suite et reste modifiable.
- **Fiche d'un chant :**
  - titre en serif, tonalité du jour, capo, formes à jouer ;
  - la grille par sections en accords, avec une bascule Accords ou Nashville ;
  - si la grille manque : « Tonalité seulement », la palette `probableChords` sous le titre « Accords probables dans cette tonalité », et un bouton Ajouter la grille.
- **Saisie de la grille :**
  - une section à la fois (Intro, Couplet, Refrain, Pont, Fin, ou un nom libre) ;
  - clavier de pastilles 1, 2m, 3m, 4, 5, 6m, 7°, plus une touche « / » pour la basse et une touche « Autre » pour saisir un accord libre ;
  - chaque toucher ajoute une mesure, et on peut effacer ou dupliquer une section.
- **Coller une grille :** zone de texte, puis aperçu de ce qui a été reconnu, puis Enregistrer. GraceGuitar doit aussi apparaître dans la feuille de partage système pour recevoir du texte (config plugin de partage si Expo Go ne le permet pas ; sinon, laisser seulement le collage et noter le reste dans le README).

### Partager un set

- Le bouton Partager crée un lien `graceguitar://import?d=` contenant le set en JSON compressé (encodage base64url) et un QR code (react-native-qrcode-svg).
- Le lien contient uniquement la date, les titres, les tonalités, les capos et les grilles en Nashville, jamais les paroles.
- Ouvrir le lien affiche un aperçu, puis « Ajouter à mes sets ». Les chants absents de la bibliothèque y sont ajoutés.
- Le futur branchement GCC Planning passera par l'interface `SetSource` prévue au lot 2.

## 7. Accords

- Pastilles de fondamentale, puis de type d'accord.
- Carte : nom en Newsreader 34, type en secondaire, bouton Écouter, manche.
- Sous la carte : position « 1 sur 12 », forme CAGED si elle existe, tablature, boutons Précédente et Suivante.
- Interrupteur « Toutes les notes de l'accord ».
- Bouton « Nommer un accord » : ouvre l'analyseur dans une feuille.

## 8. Manche

- Contrôle segmenté Gammes, CAGED, Notes.
- **Gammes :** tonalité, gamme, affichage (Épuré, Notes, Degrés), notes cibles, superposition d'un accord, interrupteur « Afficher les formes CAGED ».
- **CAGED :** qualité, forme (Toutes, C, A, G, E, D avec la case de départ), gamme autour de la forme.
- **Notes :** toutes les notes du manche, naturelles seules ou avec altérations.

## 9. Exercices

- Titre en serif, pastille de série en haut à droite.
- Carte Séance du jour, identique à l'accueil.
- Sections Manche, Accords et oreille, Théorie, Outils. L'accordeur est dans Outils, avec un écran « Bientôt disponible » tant que le micro n'est pas branché.
- Toucher un exercice ouvre ses réglages dans une `Sheet` :
  - cordes à sélection multiple, avec les raccourcis 1 corde, 2 cordes, Toutes ;
  - zone du manche, mode de réponse (À la guitare désactivé, avec la mention « Bientôt ») ;
  - interrupteurs Altérations et Chrono, compteur de questions ;
  - bouton Commencer.
- Séance en plein écran, sans barre d'onglets :
  - en haut, une croix, une barre de progression fine et le compteur ;
  - la consigne en grand (Newsreader) ;
  - en bas, les boutons Écouter et Suivante.

## 10. Espace personnel « Mon espace »

S'ouvre depuis le bouton rond de l'accueil, dans une feuille plein écran avec un bouton OK.

1. **En-tête :**
   - connecté : initiales dans un cercle, prénom en serif, e-mail ;
   - sans compte : « Crée un compte pour retrouver ta progression sur tous tes appareils », avec les boutons Créer un compte et Se connecter.
2. **Compte** (une fois connecté) :
   - Prénom ;
   - Adresse e-mail (modification confirmée par e-mail) ;
   - Mot de passe (modifier, avec l'ancien) ;
   - Connexion avec Apple (lier ou délier) ;
   - Se déconnecter.
3. **Abonnement :**
   - « GraceGuitar Plus », avec la valeur « Gratuit » et un écran « Bientôt disponible » ;
   - « Restaurer les achats », désactivé.
4. **Mon jeu :**
   - Niveau, avec « Refaire le test » ;
   - Objectif quotidien (5, 10 ou 15 minutes) ;
   - Rappel quotidien (interrupteur + heure) ;
   - Main (droitier ou gaucher) ;
   - Accordage (standard) ;
   - Formes préférées pour le capo.
5. **Louange :**
   - Église connectée : « Aucune », ou GCC Planning avec un code (prévu, branché plus tard) ;
   - Rappel du jeudi pour le set.
6. **Affichage et son :**
   - Langue ;
   - Notation (C D E ou Do Ré Mi) ;
   - Apparence ;
   - Son (interrupteur + volume).
7. **Outils :** Accorder la guitare.
8. **Données :**
   - Exporter ma progression et mes chants (JSON, feuille de partage) ;
   - Réinitialiser ma progression (confirmation).
9. **Aide et informations :** Contacter le support, Politique de confidentialité, Conditions d'utilisation, Version.
10. **Supprimer mon compte** (texte rouge, tout en bas, une fois connecté) : double confirmation, puis suppression réelle.

La langue et la notation quittent l'en-tête des écrans : elles sont uniquement ici.

## 11. Compte et synchronisation

### Principes

- **Le compte est optionnel :** toute l'app fonctionne sans, avec les données sur le téléphone.
- **Le compte sert à trois choses :** retrouver sa progression, ses chants et ses sets sur un autre appareil ; relier l'achat à la personne ; et plus tard, connecter une église.
- **La suppression du compte dans l'app est obligatoire** sur l'App Store.

### Service : Supabase

- Paquets : `@supabase/supabase-js`, `expo-secure-store`, `expo-apple-authentication`, `expo-crypto`.
- Configuration :
  - `.env` avec `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` ;
  - `.env` ajouté au `.gitignore`, et un `.env.example` créé ;
  - sans ces variables, l'app fonctionne en local et masque les boutons de compte.
- Client dans `src/services/supabase.ts`, avec la session stockée dans SecureStore (AsyncStorage sur le web).

### Écrans d'authentification

- **Créer un compte :** prénom (prérempli si connu), e-mail, mot de passe (8 caractères minimum, indicateur de force), acceptation des conditions, et « Continuer avec Apple » au-dessus.
- **Se connecter :** e-mail, mot de passe, « Mot de passe oublié ? », « Continuer avec Apple ».
- **Mot de passe oublié :** envoi d'un lien qui rouvre l'app sur `graceguitar://reset-password`.
- Erreurs claires, sans jargon : e-mail déjà utilisé, mot de passe incorrect, pas de connexion internet.
- `textContentType` et `autoComplete` renseignés, pour que le trousseau iOS propose les identifiants.

### Base de données (`supabase/schema.sql`)

- `profiles` (id = auth.users.id, first_name, level, locale, notation, handedness, preferred_capo_shapes, daily_goal_minutes, reminder_time, created_at, updated_at)
- `songs` (id, user_id, title, default_key, mode, sections jsonb, tempo, notes, reference_url, source, updated_at). Pas de colonne pour les paroles : elles ne quittent jamais l'appareil.
- `sets` (id, user_id, service_date, service_name, source, updated_at)
- `set_songs` (id, set_id, song_id, key, capo, position)
- `progress_events` (id, user_id, exercise_id, string, fret, correct, response_ms, created_at)

Row Level Security sur chaque table, avec des politiques limitées à `auth.uid()`.

Suppression du compte : Edge Function `supabase/functions/delete-account`. Elle vérifie le jeton, supprime les lignes de l'utilisateur, puis son compte. La clé de service reste uniquement côté serveur.

### Synchronisation

- **Local d'abord :** l'app écrit toujours sur le téléphone, puis envoie à Supabase si l'utilisateur est connecté.
- **À la première connexion,** les données locales sont fusionnées sur le compte, sans doublon grâce aux identifiants.
- **En conflit,** la version la plus récente (`updated_at`) l'emporte.
- **Hors ligne,** les envois attendent et repartent au retour de la connexion.

### Étapes pour Christelle (à lister dans le README)

1. Créer un projet Supabase gratuit.
2. Exécuter `supabase/schema.sql`.
3. Activer les fournisseurs E-mail et Apple, et ajouter `graceguitar://reset-password` aux URL de redirection.
4. Déployer la fonction `delete-account`.
5. Copier l'URL et la clé publique dans `.env`.

## 12. Accessibilité, i18n et finitions

- **VoiceOver sur le manche :** chaque note annonce par exemple « Corde de La, case 3, C, fondamentale ».
- **Taille de texte dynamique :** jusqu'à XL sans casser la mise en page.
- **Retour haptique :** sélection d'une tonalité, réponse juste, réponse fausse, touche du clavier Nashville.
- **i18n :** toutes les nouvelles chaînes dans `fr.ts` et `en.ts` (onglets, salutations, Mon espace, connexion, bibliothèque de chants, saisie de grille, sections de chant, états vides, partage).
- **Vérification :** chaque écran en clair et en sombre, en français et en anglais.

## 13. Ordre des commits

1. Renommage en GraceGuitar et migration des clés de stockage.
2. Thème ivoire et marron, police Newsreader, composants UI.
3. Barre d'onglets flottante et nouvelle navigation (Manche, analyseur dans Accords).
4. Questionnaire d'accueil mis à jour (prénom, formes préférées).
5. Logique des chants et des sets (`src/songs/`) avec ses tests.
6. Onglet Louange : bibliothèque, sets, saisie éclair, grille Nashville, ChordPro, partage par lien et QR code.
7. Accueil Aujourd'hui : salutation, ordre selon le jour, mode dimanche.
8. Restylage d'Accords, Manche et Exercices.
9. Mon espace, en mode local.
10. Supabase : authentification, schéma, synchronisation, suppression du compte.
11. Accessibilité, haptique, vérifications finales.

Termine par un résumé :
- ce qui est fait ;
- ce qui reste à faire côté Supabase ;
- tout écart par rapport à ce document, avec sa raison.
