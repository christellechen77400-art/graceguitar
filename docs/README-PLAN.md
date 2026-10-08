# GCCGuitare

Outil de guitare de louange de l'église GCC : manche, triades, gammes, CAGED, accords, avec les chants du dimanche reçus de l'app d'église.
Outil **interne** (pas de pub, pas de paiement). Ancien nom : GraceGuitar.

## Où est quoi
| Dossier | Contenu |
| --- | --- |
| `docs/PLAN.md` | Vision, décisions validées, architecture, découpage en lots |
| `docs/LOTS.md` | Chaque lot : tâches, critères d'acceptation, tests |
| `docs/SYNC-EGLISE.md` | Contrat de synchronisation avec l'app d'église (à valider avec le développeur) |
| `docs/DESIGN.md` + `docs/design/` | Écrans validés (captures), charte, lien vers le canvas de maquettes |
| `docs/TESTS.md` | Plan de test de la phase A (sans app d'église) |
| `docs/PROMPTS.md` | Prompts à coller dans Claude Code, un par lot |
| `docs/ACCES-IMMEDIAT.md` | Utiliser l'app tout de suite sur iPhone et iPad (PWA) pendant que la synchro se construit |
| `content/*.json` | Tips (ampoule), exercices, guide : données, pas du code |
| `docs/verification/` | Scripts Python de référence : théorie du manche et zone de triades |

## Règle d'or
La théorie (notes, intervalles, triades, zones) est **calculée**, jamais écrite à la main. Tout contenu musical passe par `src/theory/` et ses tests.
