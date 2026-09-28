---
id: ZBLK-040
type: blocker
date: 2026-09-25
tags: [nsis, installer, registry, publisher, tauri, misdiagnosis]
---

# ZBLK-040 — Sélecteur de langue NSIS invisible malgré displayLanguageSelector

| Friction                                                                                                                                                                                                                                                                                                                                            | Cause réelle                                                                                                                                                                                                                                                                                              | Solution                                                                                                                                                       | Statut |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `languages: ["French", "English"]` et `displayLanguageSelector: true` étaient configurés, mais Baptiste n'a jamais vu la boîte de choix. Environ 6 essais : `Remove-ItemProperty` refusé (mauvaise clé), relance sans effet, lecture du `installer.nsi`, capture d'écran de l'installateur, mini-installateur de test qui, lui, affichait la boîte. | La langue est mémorisée sous `HKCU\Software\<publisher>\<produit>`. En passant `publisher` à « Baptiste LECHAT », la clé est devenue `Software\Baptiste LECHAT\Hooky`, avec `Installer Language = 1036` déjà écrit, alors que l'inspection portait sur l'ancienne clé `baptistelechat`, restée orpheline. | Lire `MANUFACTURER` dans le `installer.nsi` généré, puis supprimer `Installer Language` dans `HKCU:\Software\Baptiste LECHAT\Hooky`. La config était correcte. | résolu |

## Références

- [LRN-110](../../learnings/LRN-110.md) — le pattern : la clé de mémorisation suit le publisher
- [LRN-111](../../learnings/LRN-111.md) — la méthode de capture et de mini-installateur
- [BDR-096](../../decisions/BDR-096.md) — les options d'installateur concernées
