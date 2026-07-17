# BATIMUM AI BRAIN V1.0 - Chapitre 9

## Batimum Knowledge Engine

Le moteur de connaissance est la documentation vivante de Batimum.

## Architecture

- Base centralisee: `lib/assistant-batimum/knowledge/*`
- Moteur d'acces: `lib/assistant-batimum/knowledge-engine.ts`
- Consultation obligatoire avant reponse logiciel: `lib/assistant-batimum/assistant-brain.ts`

## Principes

- Reponse immediate si la connaissance existe dans Batimum.
- Mode pedagogique pour expliquer le fonctionnement.
- Mode guide pour orienter et proposer la prochaine etape.
- Ne jamais inventer une fonctionnalite inexistante.

## Maintenance

Toute nouvelle page, champ, statut, calcul ou fonctionnalite doit etre ajoutee dans la base `knowledge` afin de garder Batimum AI synchronise avec le logiciel.
