import type { AnimationName } from "@/components/Avatar";

// Miroir manuel de docs/EVENTS.md (source de vérité tenue à jour en parallèle de
// animation_for_event(), src-tauri/src/lib.rs) - même convention de duplication
// documentée assumée par ce fichier que par le reste du projet.
export interface AnimationMappingEntry {
  label: string;
  animation: AnimationName;
  note: string;
}

export const EVENT_ANIMATIONS: AnimationMappingEntry[] = [
  {
    label: "SessionStart",
    animation: "listening",
    note: "Claude Code démarre et attend le premier prompt.",
  },
  {
    label: "UserPromptSubmit",
    animation: "thinking",
    note: "L'utilisateur vient d'envoyer un prompt, Claude commence à réfléchir dessus.",
  },
  {
    label: "PreToolUse (outil standard)",
    animation: "working",
    note: "Un outil non lié à la recherche (Edit, Write, Bash...) est en cours d'exécution.",
  },
  {
    label: "PreToolUse (recherche)",
    animation: "searching",
    note: "Un outil de recherche (Grep, WebSearch, Glob, WebFetch) est en cours d'exécution.",
  },
  {
    label: "PostToolUse",
    animation: "idle",
    note: "L'outil vient de rendre la main - pause entre deux actions, pas une fin de tâche.",
  },
  {
    label: "PostToolUseFailure",
    animation: "confused",
    note: "L'outil vient d'échouer.",
  },
  {
    label: "Stop",
    animation: "celebrate",
    note: "Claude a fini de répondre.",
  },
  {
    label: "StopFailure",
    animation: "confused",
    note: "Échec d'API pendant Stop",
  },
  {
    label: "SubagentStart",
    animation: "working",
    note: "Un sous-agent démarre du travail.",
  },
  {
    label: "SubagentStop",
    animation: "idle",
    note: "Le sous-agent a terminé.",
  },
  {
    label: "PreCompact",
    animation: "thinking",
    note: "Compaction du contexte en cours.",
  },
  {
    label: "PostCompact",
    animation: "idle",
    note: "Compaction terminée, retour à un état neutre.",
  },
  {
    label: "PermissionRequest",
    animation: "listening",
    note: "Claude Code attend une décision utilisateur (autoriser/refuser).",
  },
  {
    label: "Elicitation",
    animation: "listening",
    note: "Un serveur MCP attend une réponse utilisateur.",
  },
];

export const NOTIFICATION_ANIMATIONS: AnimationMappingEntry[] = [
  {
    label: "permission_prompt",
    animation: "listening",
    note: "Même intention que l'event PermissionRequest.",
  },
  {
    label: "elicitation_dialog",
    animation: "listening",
    note: "Un serveur MCP attend une réponse.",
  },
  {
    label: "elicitation_url_dialog",
    animation: "listening",
    note: "Un serveur MCP demande d'ouvrir une URL.",
  },
  {
    label: "elicitation_complete",
    animation: "idle",
    note: "Le formulaire MCP vient d'être soumis/fermé.",
  },
  {
    label: "elicitation_response",
    animation: "idle",
    note: "La réponse MCP vient d'être renvoyée.",
  },
  {
    label: "agent_needs_input",
    animation: "listening",
    note: "Un sous-agent attend une entrée utilisateur.",
  },
  {
    label: "agent_completed",
    animation: "idle",
    note: "Un sous-agent a terminé (succès ou échec, non distinguable ici).",
  },
  {
    label: "quota_auto_resume_fired",
    animation: "bored",
    note: "Claude Code reprend le travail après une pause quota",
  },
  {
    label: "quota_auto_resume_stale",
    animation: "bored",
    note: "Quota réinitialisé pendant une pause de plus de 30 min.",
  },
  {
    label: "quota_auto_resume_disabled",
    animation: "listening",
    note: "Claude Code abandonne l'attente sans reprendre.",
  },
  {
    label: "idle_prompt",
    animation: "bored",
    note: "Session sans réponse depuis un moment - signal réel d'inactivité.",
  },
  {
    label: "auth_success",
    animation: "idle",
    note: "Succès ponctuel isolé, pas la conclusion d'une tâche.",
  },
  {
    label: "(type inconnu / absent)",
    animation: "listening",
    note: "Repli générique pour un notification_type pas encore mappé.",
  },
];
