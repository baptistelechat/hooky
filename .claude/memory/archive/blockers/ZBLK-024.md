---
id: ZBLK-024
type: blocker
date: 2026-08-29
tags: [notification, settings, debugging, misdiagnosis, false-lead]
---

# ZBLK-024 — Notifications silencieuses : fausse piste sur une session concurrente avant le vrai bug

| Friction                                                                                                                                | Cause réelle                                                                                                                                                                                                                                              | Solution                                 | Statut |
| --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------ |
| Plus aucun son ni bulle de notification, malgré un pipeline hooks->backend->frontend fonctionnel (l'avatar réagissait bien aux events). | Le toggle "Notifications" dans Settings était simplement désactivé -- rien à voir avec le code, ni avec une autre session Claude Code concurrente active sur la même machine (suspectée un temps, écartée après audit git complet des fichiers modifiés). | Vérification directe du toggle Settings. | résolu |
