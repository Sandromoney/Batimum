# BATIMUM AI BRAIN V1.0 - Chapitre 7

## Tools Engine

Le cerveau ne modifie jamais directement les donnees. Il passe par des outils Batimum avec validation.

## Architecture

- Registre d'outils: `lib/assistant-batimum/tools-engine.ts`
- Execution: `lib/batimum-assistant-executor.ts`

## Contrat d'un outil

- nom
- description
- parametres requis
- validation avant appel
- resultat
- gestion d'erreur claire

## Regles

- Aucune action importante hors outil.
- Si parametres manquants: pas d'appel outil, question ciblee.
- Si echec outil: expliquer la cause et proposer la suite.
