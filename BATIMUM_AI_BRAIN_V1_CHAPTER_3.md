# BATIMUM AI BRAIN V1.0 - Chapitre 3

## Moteur de raisonnement cognitif

Le raisonnement devient obligatoire avant toute reponse ou execution.

## Pipeline de raisonnement

1. analyse de la demande
2. recherche contexte (20 derniers messages + contexte actif)
3. identification du sujet
4. identification de l'intention principale
5. extraction des informations
6. completion avec donnees Batimum
7. evaluation de certitude
8. generation d'un plan
9. verification pre-action
10. securite
11. execution via outils Batimum
12. verification finale
13. reponse naturelle

## Implementation

- Moteur independant: `lib/assistant-batimum/reasoning-engine.ts`
- Integration pipeline: `lib/assistant-batimum/copilot-pipeline.ts`
- Trace interne: plan, sujet, certitude, verifications

## Regles

- Aucune reponse d'action sans passage par le moteur de raisonnement
- Aucune execution si verification de raisonnement en echec
- Aucune execution si confiance < 0.95
