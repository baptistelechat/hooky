---
id: ZBLK-019
type: blocker
date: 2026-08-26
summary: "`tauri dev` laissait un process zombie sur le port 1420"
tags: [tauri, dev-server, zombie-process, port-conflict, run-in-background]
status: résolu
---

# BLK-019 — `tauri dev` laissait un process zombie sur le port 1420

**Friction** : Après un premier lancement de `rtk pnpm tauri dev` en arrière-plan, le relancer échouait avec "Port 1420 is already in use", et l'app ne redémarrait plus proprement.

**Cause réelle** : Le premier lancement combinait `run_in_background:true` (déjà géré par l'outil Bash) avec un `&` en fin de commande dans le script -- le wrapper shell sortait immédiatement (exit 0) sans surveiller le process réel, qui continuait de tourner en `node` orphelin gardant le port 1420 ouvert, invisible pour le suivi de tâche.

**Solution** : Identifié via `Get-NetTCPConnection -LocalPort 1420 -State Listen` (PowerShell), le process `node` zombie (et le `hooky.exe` associé) tués explicitement avant de relancer `rtk pnpm tauri dev` sans `&`.

## Références

- [LRN-034](../../learnings/LRN-034.md) — pattern extrait (ne pas combiner `run_in_background` et `&`)
