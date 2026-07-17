# BATIMUM AI BRAIN V1.0 - Chapitre 10

## Batimum Copilot Engine

Le copilote observe les donnees et propose une seule recommandation utile, non intrusive.

## Architecture

- Moteur: `lib/assistant-batimum/copilot-engine.ts`
- Integration pipeline: `lib/assistant-batimum/copilot-pipeline.ts`
- Affichage conversation: `components/batimum-assistant-chat.tsx`

## Regles

- Une seule recommandation a la fois.
- Priorisation: critique > importante > normale > information.
- Mode silencieux pendant creation/modification sensibles.
- Recommandations basees uniquement sur les donnees Batimum.
