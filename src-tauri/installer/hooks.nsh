; Hooky tourne en tray (single-instance) : son .exe reste verrouillé tant qu'il n'a
; pas quitté, ce qui fait échouer l'auto-désinstallation de l'ancienne version au
; moment d'une mise à jour ("Unable to uninstall!" / "Error launching installer").
; On le ferme avant toute installation ou désinstallation, silencieusement.

!macro NSIS_HOOK_PREINSTALL
  nsExec::ExecToLog 'taskkill /IM hooky.exe /F'
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  nsExec::ExecToLog 'taskkill /IM hooky.exe /F'
!macroend
