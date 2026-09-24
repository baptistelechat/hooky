import type { AnimationName } from "@/components/Avatar";
import type { CodexRowName } from "@/lib/codexPets";
import { ArchiveIcon } from "@/components/icons/archive";
import { BadgeAlertIcon } from "@/components/icons/badge-alert";
import { BotIcon } from "@/components/icons/bot";
import { BrainIcon } from "@/components/icons/brain";
import { CircleHelpIcon } from "@/components/icons/circle-help";
import { ExternalLinkIcon } from "@/components/icons/external-link";
import { MessageCircleMoreIcon } from "@/components/icons/message-circle-more";
import { PauseIcon } from "@/components/icons/pause";
import { SearchIcon } from "@/components/icons/search";
import { SparklesIcon } from "@/components/icons/sparkles";
import { SquarePenIcon } from "@/components/icons/square-pen";
import { type LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

// Miroir manuel de docs/EVENTS.md (source de vérité tenue à jour en parallèle de
// animation_for_event(), src-tauri/src/lib.rs) - même convention de duplication
// documentée assumée par ce fichier que par le reste du projet.

/** Type structurel minimal pour une icône de badge -- couvre à la fois les icônes
 * lucide-react statiques restantes (`Ear`, sans équivalent animé) et les icônes animées de
 * `components/icons/` (lucide-animated, boucle continue), qui n'exposent ni le même type de
 * ref (`SVGSVGElement` vs un handle `{ startAnimation, stopAnimation }`) ni les mêmes props
 * que `LucideIcon` -- seuls `size` et `className` sont réellement consommés par
 * `AnimationOverlay`. */
export type BadgeIcon =
  | LucideIcon
  | ComponentType<{ size?: number; className?: string }>;

export interface AnimationMappingEntry {
  label: string;
  animation: AnimationName;
  note: string;
  /** Badge affiché sur l'avatar (AnimationOverlay) -- choisi par hook, pas par animation :
   * plusieurs hooks partagent la même animation (ex. SessionStart et PermissionRequest
   * partagent "listening") sans avoir le même sens, une icône unique par bucket
   * d'animation n'aurait donc pas de sens (ex. une oreille sur SessionStart). Absent pour
   * les hooks qui n'ont pas besoin d'insister (idle, working générique...). */
  icon?: BadgeIcon;
  /** Niveau C de la table pets Codex : ligne de spritesheet propre à ce hook, quand elle
   * diffère du repli par état (`STATE_TO_ROW`, niveau B) -- ex. `SessionStart` et
   * `PermissionRequest` sont tous deux `listening`, mais l'un salue (`waving`) et l'autre
   * attend (`waiting`, via le niveau B). Absent = le niveau B suffit. Sans effet sur les
   * avatars procéduraux. */
  codexAnimation?: CodexRowName;
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
    icon: SparklesIcon,
    codexAnimation: "waving",
    trigger: { hookEventName: "SessionStart" },
  },
  {
    label: "UserPromptSubmit",
    animation: "thinking",
    note: "L'utilisateur vient d'envoyer un prompt, Claude commence à réfléchir dessus.",
    icon: BrainIcon,
    trigger: { hookEventName: "UserPromptSubmit" },
  },
  {
    label: "PreToolUse (outil standard)",
    animation: "working",
    note: "Un outil non lié à la recherche (Edit, Write, Bash...) est en cours d'exécution.",
    icon: SquarePenIcon,
    trigger: { hookEventName: "PreToolUse", toolName: "Edit" },
  },
  {
    label: "PreToolUse (recherche)",
    animation: "searching",
    note: "Un outil de recherche (Grep, WebSearch, Glob, WebFetch) est en cours d'exécution.",
    icon: SearchIcon,
    trigger: { hookEventName: "PreToolUse", toolName: "Grep" },
  },
  {
    label: "PostToolUse",
    animation: "idle",
    note: "L'outil vient de rendre la main - pause entre deux actions, pas une fin de tâche.",
    icon: BrainIcon,
    trigger: { hookEventName: "PostToolUse" },
  },
  {
    label: "PostToolUseFailure",
    animation: "confused",
    note: "L'outil vient d'échouer.",
    icon: BadgeAlertIcon,
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
    icon: BadgeAlertIcon,
    trigger: { hookEventName: "StopFailure" },
  },
  {
    label: "SubagentStart",
    animation: "working",
    note: "Un sous-agent démarre du travail.",
    icon: BotIcon,
    trigger: { hookEventName: "SubagentStart" },
  },
  {
    label: "SubagentStop",
    animation: "idle",
    note: "Le sous-agent a terminé.",
    icon: BrainIcon,
    trigger: { hookEventName: "SubagentStop" },
  },
  {
    label: "PreCompact",
    animation: "thinking",
    note: "Compaction du contexte en cours.",
    icon: ArchiveIcon,
    trigger: { hookEventName: "PreCompact" },
  },
  {
    label: "PostCompact",
    animation: "idle",
    note: "Compaction terminée, retour à un état neutre.",
    icon: BrainIcon,
    trigger: { hookEventName: "PostCompact" },
  },
  {
    label: "PermissionRequest",
    animation: "listening",
    note: "Claude Code attend une décision utilisateur (autoriser/refuser).",
    icon: CircleHelpIcon,
    trigger: { hookEventName: "PermissionRequest" },
  },
  {
    label: "Elicitation",
    animation: "listening",
    note: "Un serveur MCP attend une réponse utilisateur.",
    icon: CircleHelpIcon,
    trigger: { hookEventName: "Elicitation" },
  },
];

export const NOTIFICATION_ANIMATIONS: AnimationMappingEntry[] = [
  {
    label: "permission_prompt",
    animation: "listening",
    note: "Même intention que l'event PermissionRequest.",
    icon: CircleHelpIcon,
    trigger: {
      hookEventName: "Notification",
      notificationType: "permission_prompt",
    },
  },
  {
    label: "elicitation_dialog",
    animation: "listening",
    note: "Un serveur MCP attend une réponse.",
    icon: CircleHelpIcon,
    trigger: {
      hookEventName: "Notification",
      notificationType: "elicitation_dialog",
    },
  },
  {
    label: "elicitation_url_dialog",
    animation: "listening",
    note: "Un serveur MCP demande d'ouvrir une URL.",
    icon: ExternalLinkIcon,
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
    icon: CircleHelpIcon,
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
    codexAnimation: "waving",
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
    icon: PauseIcon,
    trigger: {
      hookEventName: "Notification",
      notificationType: "quota_auto_resume_disabled",
    },
  },
  {
    label: "idle_prompt",
    animation: "sleeping",
    note: "Session sans réponse depuis un moment - signal réel d'inactivité, plus fort qu'un simple bored.",
    trigger: { hookEventName: "Notification", notificationType: "idle_prompt" },
  },
  {
    label: "auth_success",
    animation: "idle",
    note: "Succès ponctuel isolé, pas la conclusion d'une tâche.",
    codexAnimation: "waving",
    trigger: {
      hookEventName: "Notification",
      notificationType: "auth_success",
    },
  },
  {
    label: "(type inconnu / absent)",
    animation: "listening",
    note: "Repli générique pour un notification_type pas encore mappé.",
    icon: MessageCircleMoreIcon,
    trigger: {
      hookEventName: "Notification",
      notificationType: "__preview_unmapped__",
    },
  },
];

/** Surcharge de ligne Codex (niveau C) à appliquer au pet flottant : celle de l'entrée du hook
 * affiché, mais seulement si l'état agrégé (multi-session) est bien celui que ce hook
 * produirait seul -- sinon une autre session a pris la main et le repli par état (niveau B)
 * s'applique, même garde que `findMappingEntry` pour `PreToolUse`. */
export function codexOverrideFor(
  entry: AnimationMappingEntry | undefined,
  animation: AnimationName,
): CodexRowName | undefined {
  return entry?.animation === animation ? entry.codexAnimation : undefined;
}

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
