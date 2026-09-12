---
id: ZBLK-032
type: blocker
date: 2026-09-11
tags: [usage-panel, rate-limit, misdiagnosis, debugging, 429]
---

# ZBLK-032 — Panneau de quotas bloqué sur "Chargement…" après la maj v0.2.0

| Friction                                                                                                                                     | Cause réelle                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Solution                                                                                                                                                                                                                                                                                                                | Statut |
| -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Le panneau d'usage Claude Code restait bloqué sur "Chargement…" une bonne minute après l'installation de la v0.2.0, sans jamais se résoudre. | Diagnostic initial erroné : suspicion d'un `CryptoProvider` rustls manquant (panique silencieuse de la tâche du poller). Test réel (relance du binaire avec stderr redirigé, single-instance plugin tué au préalable) a révélé la vraie cause : 429 Too Many Requests de `api/oauth/usage`, aggravé par un retry fixe 15s qui martelait l'endpoint pendant qu'il restait rate-limité -- et une erreur écrasait le cache, indistinguable de "pas encore chargé" côté front. | Backoff exponentiel (60s→900s) + cache jamais écrasé par une erreur, cf. [BDR-071](../../decisions/BDR-071.md). **Résolu prématurément** : le vrai succès réseau n'avait pas pu être confirmé en direct -- la session suivante a révélé une deuxième cause distincte (token OAuth expiré), cf. [ZBLK-033](ZBLK-033.md). | résolu |

## Références

- [BDR-071](../../decisions/BDR-071.md) — fix appliqué (backoff)
- [LRN-081](../../learnings/LRN-081.md), [LRN-082](../../learnings/LRN-082.md) — patterns extraits
- [ZBLK-033](ZBLK-033.md) — deuxième cause découverte après cette "résolution"
