# BATIMUM AI BRAIN V1.0 - Chapitre 6

## Decision Engine

Le moteur de decision est obligatoire avant toute execution.

## Sequence

1. comprendre
2. objectif
3. donnees
4. manquants
5. consultation Batimum
6. comparaison des options
7. choix
8. plan
9. confirmation
10. execution
11. controle
12. information utilisateur

## Implementation

- Moteur independant: `lib/assistant-batimum/decision-engine.ts`
- Integration pipeline: `lib/assistant-batimum/copilot-pipeline.ts`
- Base conflits/ambiguite: `lib/assistant-batimum/reasoning-engine.ts` et `assistant-entity-resolver.ts`

## Regles

- Jamais d'execution directe sans decision `readyToExecute`.
- Si conflit, proposer des alternatives concretes.
- Si ambiguite de cible, ne pas choisir au hasard.
