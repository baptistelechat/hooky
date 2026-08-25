import {
  Archive,
  Bot,
  Brain,
  Ear,
  ExternalLink,
  HelpCircle,
  MessageCircleQuestion,
  PauseCircle,
  Search,
  Sparkles,
  TriangleAlert,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { AnimationName } from "@/components/Avatar";

// Miroir manuel de docs/EVENTS.md (source de vérité tenue à jour en parallèle de
// animation_for_event(), src-tauri/src/lib.rs) - même convention de duplication
// documentée assumée par ce fichier que par le reste du projet.
export interface AnimationMappingEntry {
  label: string;
  animation: AnimationName;
  note: string;
  /** Badge affiché sur l'avatar (AnimationOverlay) -- choisi par hook, pas par animation :
   * plusieurs hooks partagent la même animation (ex. SessionStart et PermissionRequest
   * partagent "listening") sans avoir le même sens, une icône unique par bucket
   * d'animation n'aurait donc pas de sens (ex. une oreille sur SessionStart). Absent pour
   * les hooks qui n'ont pas besoin d'insister (idle, working générique...). */
  icon?: LucideIcon;
  /** Payload minimal pour rejouer cette entrée sur le vrai backend (POST /event, cf.
   * lib/eventTrigger.ts) -- mêmes champs que ceux lus par `on_event()` côté Rust. */
  trigger: {
    hookEventName: string;
    toolName?: string;
    notificationType?: string;
  };
}

export const EVENT_ANIMATIONS: AnimationMappingEntry[] = [
  {
    label: "SessionStart",
    animation: "listening",
    note: "Claude Code démarre et attend le premier prompt.",
    icon: Sparkles,
    trigger: { hookEventName: "SessionStart" },
  },
  {
    label: "UserPromptSubmit",
    animation: "thinking",
    note: "L'utilisateur vient d'envoyer un prompt, Claude commence à réfléchir dessus.",
    icon: Brain,
    trigger: { hookEventName: "UserPromptSubmit" },
  },
  {
    label: "PreToolUse (outil standard)",
    animation: "working",
    note: "Un outil non lié à la recherche (Edit, Write, Bash...) est en cours d'exécution.",
    icon: Wrench,
    trigger: { hookEventName: "PreToolUse", toolName: "Edit" },
  },
  {
    label: "PreToolUse (recherche)",
    animation: "searching",
    note: "Un outil de recherche (Grep, WebSearch, Glob, WebFetch) est en cours d'exécution.",
    icon: Search,
    trigger: { hookEventName: "PreToolUse", toolName: "Grep" },
  },
  {
    label: "PostToolUse",
    animation: "idle",
    note: "L'outil vient de rendre la main - pause entre deux actions, pas une fin de tâche.",
    trigger: { hookEventName: "PostToolUse" },
  },
  {
    label: "PostToolUseFailure",
    animation: "confused",
    note: "L'outil vient d'échouer.",
    icon: TriangleAlert,
    trigger: { hookEventName: "PostToolUseFailure" },
  },
  {
    label: "Stop",
    animation: "celebrate",
    note: "Claude a fini de répondre.",
    trigger: { hookEventName: "Stop" },
  },
  {
    label: "StopFailure",
    animation: "confused",
    note: "Échec d'API pendant Stop",
    icon: TriangleAlert,
    trigger: { hookEventName: "StopFailure" },
  },
  {
    label: "SubagentStart",
    animation: "working",
    note: "Un sous-agent démarre du travail.",
    icon: Bot,
    trigger: { hookEventName: "SubagentStart" },
  },
  {
    label: "SubagentStop",
    animation: "idle",
    note: "Le sous-agent a terminé.",
    trigger: { hookEventName: "SubagentStop" },
  },
  {
    label: "PreCompact",
    animation: "thinking",
    note: "Compaction du contexte en cours.",
    icon: Archive,
    trigger: { hookEventName: "PreCompact" },
  },
  {
    label: "PostCompact",
    animation: "idle",
    note: "Compaction terminée, retour à un état neutre.",
    trigger: { hookEventName: "PostCompact" },
  },
  {
    label: "PermissionRequest",
    animation: "listening",
    note: "Claude Code attend une décision utilisateur (autoriser/refuser).",
    icon: Ear,
    trigger: { hookEventName: "PermissionRequest" },
  },
  {
    label: "Elicitation",
    animation: "listening",
    note: "Un serveur MCP attend une réponse utilisateur.",
    icon: MessageCircleQuestion,
    trigger: { hookEventName: "Elicitation" },
  },
];

export const NOTIFICATION_ANIMATIONS: AnimationMappingEntry[] = [
  {
    label: "permission_prompt",
    animation: "listening",
    note: "Même intention que l'event PermissionRequest.",
    icon: MessageCircleQuestion,
    trigger: {
      hookEventName: "Notification",
      notificationType: "permission_prompt",
    },
  },
  {
    label: "elicitation_dialog",
    animation: "listening",
    note: "Un serveur MCP attend une réponse.",
    icon: MessageCircleQuestion,
    trigger: {
      hookEventName: "Notification",
      notificationType: "elicitation_dialog",
    },
  },
  {
    label: "elicitation_url_dialog",
    animation: "listening",
    note: "Un serveur MCP demande d'ouvrir une URL.",
    icon: ExternalLink,
    trigger: {
      hookEventName: "Notification",
      notificationType: "elicitation_url_dialog",
    },
  },
  {
    label: "elicitation_complete",
    animation: "idle",
    note: "Le formulaire MCP vient d'être soumis/fermé.",
    trigger: {
      hookEventName: "Notification",
      notificationType: "elicitation_complete",
    },
  },
  {
    label: "elicitation_response",
    animation: "idle",
    note: "La réponse MCP vient d'être renvoyée.",
    trigger: {
      hookEventName: "Notification",
      notificationType: "elicitation_response",
    },
  },
  {
    label: "agent_needs_input",
    animation: "listening",
    note: "Un sous-agent attend une entrée utilisateur.",
    icon: MessageCircleQuestion,
    trigger: {
      hookEventName: "Notification",
      notificationType: "agent_needs_input",
    },
  },
  {
    label: "agent_completed",
    animation: "idle",
    note: "Un sous-agent a terminé (succès ou échec, non distinguable ici).",
    trigger: {
      hookEventName: "Notification",
      notificationType: "agent_completed",
    },
  },
  {
    label: "quota_auto_resume_fired",
    animation: "bored",
    note: "Claude Code reprend le travail après une pause quota",
    trigger: {
      hookEventName: "Notification",
      notificationType: "quota_auto_resume_fired",
    },
  },
  {
    label: "quota_auto_resume_stale",
    animation: "bored",
    note: "Quota réinitialisé pendant une pause de plus de 30 min.",
    trigger: {
      hookEventName: "Notification",
      notificationType: "quota_auto_resume_stale",
    },
  },
  {
    label: "quota_auto_resume_disabled",
    animation: "listening",
    note: "Claude Code abandonne l'attente sans reprendre.",
    icon: PauseCircle,
    trigger: {
      hookEventName: "Notification",
      notificationType: "quota_auto_resume_disabled",
    },
  },
  {
    label: "idle_prompt",
    animation: "bored",
    note: "Session sans réponse depuis un moment - signal réel d'inactivité.",
    trigger: { hookEventName: "Notification", notificationType: "idle_prompt" },
  },
  {
    label: "auth_success",
    animation: "idle",
    note: "Succès ponctuel isolé, pas la conclusion d'une tâche.",
    trigger: {
      hookEventName: "Notification",
      notificationType: "auth_success",
    },
  },
  {
    label: "(type inconnu / absent)",
    animation: "listening",
    note: "Repli générique pour un notification_type pas encore mappé.",
    icon: HelpCircle,
    trigger: {
      hookEventName: "Notification",
      notificationType: "__preview_unmapped__",
    },
  },
];

/** Retrouve l'entrée du catalogue correspondant au hook actuellement affiché sur le vrai
 * pet (lastEvent/toolName/notificationType, cf. useHookyState) -- c'est cette entrée qui
 * porte l'icône à afficher (AnimationOverlay), pas `animation` seule (plusieurs hooks
 * partagent le même bucket d'animation sans avoir le même sens). */
export function findMappingEntry(
  hookEventName: string | undefined,
  animation: AnimationName,
  notificationType: string | undefined,
): AnimationMappingEntry | undefined {
  if (!hookEventName) return undefined;

  if (hookEventName === "Notification") {
    return (
      NOTIFICATION_ANIMATIONS.find(
        (entry) => entry.trigger.notificationType === notificationType,
      ) ??
      NOTIFICATION_ANIMATIONS.find(
        (entry) => entry.label === "(type inconnu / absent)",
      )
    );
  }

  if (hookEventName === "PreToolUse") {
    return EVENT_ANIMATIONS.find(
      (entry) =>
        entry.trigger.hookEventName === "PreToolUse" &&
        entry.animation === animation,
    );
  }

  return EVENT_ANIMATIONS.find(
    (entry) => entry.trigger.hookEventName === hookEventName,
  );
}
