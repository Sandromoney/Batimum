# BATIMUM AI — Definition of Done (DoD)

Cette checklist est obligatoire avant de considérer une évolution IA comme terminée.

## 1) Compréhension
- [ ] L'intention principale est déterminée (une seule).
- [ ] Le verbe d'action est correctement priorisé.
- [ ] Les entités utiles sont extraites (client, devis, chantier, employé, dates...).
- [ ] Le contexte conversationnel est pris en compte (mémoire courte + active).

## 2) Fiabilité
- [ ] Aucune donnée inventée.
- [ ] Score de confiance appliqué (gating 95/80/<80).
- [ ] En cas d'incertitude, question ciblée unique.
- [ ] Pas de "Pouvez-vous préciser ?" si une question précise est possible.

## 3) Sécurité d'action
- [ ] Aucune action sensible sans confirmation explicite.
- [ ] Résumé clair avant exécution.
- [ ] Résultat d'exécution vérifié et message de retour explicite.

## 4) Expérience utilisateur
- [ ] Ton professionnel naturel, vouvoiement.
- [ ] Réponse utile et actionnable.
- [ ] Pas de proposition hors sujet quand l'utilisateur remercie/salue.
- [ ] Réponse concise mais suffisante pour décider.

## 5) Régression
- [ ] `npx tsc --noEmit` passe.
- [ ] `scripts/test-assistant-phrases.ts` passe.
- [ ] `scripts/test-assistant-scenarios.ts` passe.
- [ ] Nouveaux scénarios ajoutés pour les nouveaux cas.

## 6) Vision produit
- [ ] La feature renforce Batimum AI comme "collaborateur numérique".
- [ ] Elle fait réellement gagner du temps, ou augmente la fiabilité.
- [ ] Elle respecte `BATIMUM_AI_CHARTER.md`.

