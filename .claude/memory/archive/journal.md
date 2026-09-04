---
register: archive-journal
---

## Index

| Date       | Fusions | Archivages | Consolidation |
| ---------- | ------- | ---------- | ------------- |
| 2026-08-25 | 1       | 0          | #1            |
| 2026-08-31 | 0       | 1          | #2            |

---

## 2026-08-25 — Consolidation #1

### FUSIONNER (1 fusion)

- [BDR-014](../decisions/BDR-014.md) (fusion de [ZBDR-008](decisions/ZBDR-008.md), [ZBDR-009](decisions/ZBDR-009.md)) — composants en Tailwind, resets globaux gardés dans `App.css`

### ARCHIVER (0 entrée)

Aucune — aucun mot-clé d'abandon ni candidat statut/âge détecté.

### Observations

- Entrées actives avant / après (decisions) : 14 → 13
- Prochaine consolidation : sur demande

## 2026-08-31 — Consolidation #2

### FUSIONNER (0 fusion)

Aucune — l'analyse par recoupement de tags (~210 paires) n'a révélé aucun doublon confirmé : les paires reflètent la chronologie normale d'un projet mono-domaine, pas des redites.

### ARCHIVER (1 entrée)

- [ZBDR-052](decisions/ZBDR-052.md) — fenêtre dynamique par notification, abandonnée (flash), révisée par [BDR-053](../decisions/BDR-053.md)

### Observations

- Candidats écartés après vérification Phase B (faux positifs du scan mots-clés) : BDR-024 (décision elle-même toujours active), BDR-062 (décision courante valide), BDR-054 (statut `actif` en fichier source malgré `révisé` en index, toujours référencée)
- Entrées actives avant / après (decisions) : 63 → 62
- Prochaine consolidation : sur demande
