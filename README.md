# GraceGuitar

Guitare de louange — le manche, les accords, les exercices, les chants du dimanche.
FR / EN.

```bash
npm install
npx expo install --fix
npx expo start
```

## Scripts

| Commande | Rôle |
|---|---|
| `npm run typecheck` | Vérification TypeScript |
| `npm run test:theory` | Vérifie tout ce qui est pur (théorie, exercices, chants, migration, compte) |
| `npm run gen:sounds` | Régénère les échantillons de guitare dans `assets/sounds/` |
| `npm run gen:icon` | Régénère l'icône provisoire (nécessite Python et Pillow) |

Voir `CLAUDE.md` pour l'architecture et la suite du développement.

## Ce qu'il faut savoir avant de toucher au code

- **Aucune logique musicale dans les écrans.** Elle vit dans `src/theory/` (ou `src/practice/`,
  `src/songs/`, `src/services/`) et se vérifie dans `scripts/theory-check.ts`.
- **Toute chaîne visible passe par `t`**, en français et en anglais. Les deux dictionnaires ont
  exactement les mêmes clés.
- **La palette et la typographie sont dans `src/theme.ts`**, et nulle part ailleurs : une couleur
  écrite dans un écran ne suivra pas le mode sombre.
- **Les paroles de chants ne quittent jamais l'appareil** — ni dans un partage, ni en base.
- `npm run typecheck` et `npm run test:theory` passent avant chaque commit.


## Compte et synchronisation

L'app fonctionne entièrement sans compte. Le compte sert à retrouver sa progression, ses chants
et ses sets sur un autre appareil. Il s'appuie sur Supabase.

**Sans** `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY`, l'app tourne en local et
les boutons de compte sont masqués : c'est l'état normal tant que le projet Supabase n'est pas créé.

### Étapes à faire une fois

1. Créer un projet Supabase gratuit.
2. Exécuter `supabase/schema.sql` dans l'éditeur SQL du projet.
3. Activer les fournisseurs **E-mail** et **Apple**, et ajouter `graceguitar://reset-password`
   aux URL de redirection autorisées.
4. Déployer la fonction `delete-account` (`supabase/functions/delete-account`) :
   ```bash
   npx supabase functions deploy delete-account
   ```
5. Copier l'URL du projet et la clé publique dans `.env` :
   ```bash
   cp .env.example .env
   ```

La clé de service de Supabase reste **uniquement** dans les secrets de la fonction Edge, jamais
dans l'app ni dans le dépôt.

### Ce qu'Expo Go ne permet pas

Deux choses demandent un *development build* (`npx expo run:ios`), pas Expo Go :

- **Les liens `graceguitar://`** — le retour de mot de passe (`graceguitar://reset-password`) et
  l'import d'un set partagé. Le code les lit, mais c'est le système qui doit ouvrir l'app, et
  Expo Go ne peut pas s'enregistrer sous ce schéma.
- **Recevoir un texte ChordPro par la feuille de partage.** Le plugin de configuration
  correspondant ne peut pas être enregistré dans Expo Go, donc l'import se fait pour l'instant en
  collant le texte dans l'app.

Tout le reste — les chants, les sets, les exercices, le son, le compte — fonctionne dans Expo Go.
