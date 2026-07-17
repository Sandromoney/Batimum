# BATIMUM AI BRAIN V1.0 - Chapitre 5

## Memory Engine

Le moteur memoire conserve un contexte utile et evite de reposer des questions deja connues.

## Les 6 niveaux

1. Memoire immediate (message en cours)
2. Memoire de conversation (historique + entites actives)
3. Contexte logiciel (page, module, document actif)
4. Memoire entreprise (parametres et contexte metier)
5. Memoire operationnelle (taches en cours)
6. Memoire habitudes (preferences utilisateur quand prevu)

## Implementation

- Fichier coeur: `lib/assistant-batimum/assistant-memory.ts`
- Integration chat: `components/batimum-assistant-chat.tsx`
- Le pipeline relit les 20 derniers messages et maintient les sujets actifs/inactifs.

## Regles

- Ne jamais redemander une information deja connue.
- Maintenir le sujet actif jusqu'a changement explicite.
- Conserver les references (client/devis/chantier/employe) pour les pronoms contextuels.
