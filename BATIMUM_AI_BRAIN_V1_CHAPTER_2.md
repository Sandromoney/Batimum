# BATIMUM AI BRAIN V1.0 - Chapitre 2

## Le cerveau cognitif

A partir de cette version, l'assistant suit un pipeline cognitif explicite et immuable.

## Ordre d'execution (IMMUTABLE)

1. observation
2. comprehension
3. intent
4. entities
5. memory
6. context
7. reasoning
8. planning
9. security
10. tools
11. verification
12. response

## Contrat technique

- Aucune reponse ne doit contourner ce pipeline.
- L'analyse n'execute jamais directement d'action critique.
- Toute action sensible passe par resume + confirmation.
- La confiance guide le comportement:
  - >= 0.99: action directe
  - 0.95 - 0.98: action + confirmation
  - 0.85 - 0.94: question ciblee
  - 0.70 - 0.84: demande de precision
  - < 0.70: reformulation demandee

## Implementation actuelle

- Pipeline: `lib/assistant-batimum/copilot-pipeline.ts`
- NLU verbe->intention->entites: `lib/assistant-batimum/assistant-nlu-engine.ts`
- Resolution fuzzy des entites: `lib/assistant-batimum/assistant-entity-resolver.ts`
- Routage: `lib/assistant-batimum/assistant-router.ts`
- Cerveau principal: `lib/assistant-batimum/assistant-brain.ts`

## Regle projet

Toute nouvelle fonctionnalite IA doit s'accrocher a ce pipeline, sans if/else isole hors flux cognitif.
