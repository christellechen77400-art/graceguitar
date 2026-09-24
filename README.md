# GraceGuitar

Guitare de louange — le manche, les accords, les chants du dimanche.
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
| `npm run test:theory` | Vérifie le moteur (théorie, exercices, chants, migration) |
| `npm run gen:sounds` | Régénère les échantillons de guitare dans `assets/sounds/` |
| `npm run gen:icon` | Régénère l'icône provisoire (nécessite Python et Pillow) |

Voir `CLAUDE.md` pour l'architecture et la suite du développement.

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
