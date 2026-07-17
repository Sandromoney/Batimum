# BATIMUM AI — Feature Scorecard

Utilisez cette matrice avant d'implémenter une idée IA.

Score par critère: 0 (nul) à 5 (excellent).  
Seuil recommandé pour lancer: **>= 24/35** et aucun critère critique < 3.

## Critères

1. **Utilité terrain (critique)**  
   La feature aide-t-elle un artisan/dirigeant sur un cas réel fréquent?

2. **Gain de temps (critique)**  
   Réduit-elle des manipulations ou évite-t-elle des allers-retours?

3. **Fiabilité / réduction d'erreurs (critique)**  
   Diminue-t-elle les erreurs humaines et ambiguïtés?

4. **Qualité de compréhension NLU**  
   Comprend-elle mieux les formulations naturelles/contextuelles?

5. **Sécurité des actions**  
   Respecte-t-elle strictement le principe de confirmation?

6. **Cohérence conversationnelle**  
   Améliore-t-elle la mémoire/contexte et évite-t-elle les ruptures?

7. **Maintenabilité / extensibilité**  
   Permet-elle d'ajouter facilement de nouveaux intents/entités/actions?

## Décision
- **Go**: score >= 24 et tous les critères critiques >= 3
- **Rework**: score 18-23 ou un critère critique < 3
- **No-go**: score < 18

## Template d'évaluation

Feature: `<nom>`

- Utilité terrain: `/5`
- Gain de temps: `/5`
- Fiabilité: `/5`
- Compréhension NLU: `/5`
- Sécurité actions: `/5`
- Cohérence conversationnelle: `/5`
- Maintenabilité: `/5`

Total: `/35`  
Décision: `Go / Rework / No-go`  
Commentaire: `<1-3 lignes>`

