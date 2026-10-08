# Utiliser GCCGuitare tout de suite (iPhone, iPad)

Phase A : le dépôt est sur le compte GitHub **perso**, et l'app marche seule : on saisit les accords d'un chant et elle propose les triades. La synchro avec l'église viendra après le transfert du dépôt (lots 5I et 6).

## Voir les maquettes
Ouvrir le canvas de maquettes (lien dans `DESIGN.md`) depuis l'app Claude sur iPhone ou iPad.

## Installer l'app (PWA) sur l'écran d'accueil
1. Le dépôt perso est relié à Netlify (déploiement automatique à chaque fusion dans `main`). Après le transfert au compte de l'église, il faudra reconnecter Netlify au nouveau dépôt.
2. Ouvrir l'adresse Netlify dans **Safari**.
3. Bouton Partager, puis « Sur l'écran d'accueil ».
4. L'app s'ouvre en plein écran, comme une app.

## Variables d'environnement (Netlify, jamais dans le dépôt)
| Variable | Rôle |
| --- | --- |
| `EXPO_PUBLIC_APP_URL` | adresse publique de l'app |
| `EXPO_PUBLIC_BETA_CODE` | code d'accès pendant la phase de test |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | seulement au lot 6, valeurs fournies par le développeur de l'app d'église |

## Après le transfert
- Tu continues à tester la PWA (branche `main`) ; le développeur construit la synchro sur une branche à part.
- Chaque lot fusionné met à jour la PWA en quelques minutes : recharger la page, ou supprimer puis réinstaller l'icône si l'ancienne version reste.
