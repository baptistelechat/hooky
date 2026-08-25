import type { AnimationMappingEntry } from "./animationCatalog";

const SERVER_URL = "http://127.0.0.1:4242/event";

// Session dédiée à l'aperçu manuel (onglet Animation) -- isolée des vraies sessions
// Claude Code pour ne pas fausser resolve_state() côté Rust avec une collision d'id.
export const PREVIEW_SESSION_ID = "hooky-settings-preview";

async function postEvent(body: Record<string, string>): Promise<void> {
  try {
    await fetch(SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // ponytail: le pet n'est peut-être pas lancé (fenêtre settings ouverte seule) --
    // pas une erreur à faire remonter, la carte continue de rejouer sa preview locale.
  }
}

/** Rejoue une entrée du catalogue sur le vrai backend (même route /event que les hooks
 * Claude Code) pour voir l'animation ET ses effets visuels sur le pet réel. Reste affiché
 * jusqu'au prochain clic (ou vrai hook Claude Code) -- pas de retour automatique, un essai
 * avec revert après 3s a été jugé moins bon. */
export function triggerPreview(entry: AnimationMappingEntry): Promise<void> {
  const { trigger } = entry;
  const body: Record<string, string> = {
    session_id: PREVIEW_SESSION_ID,
    hook_event_name: trigger.hookEventName,
  };
  if (trigger.toolName) body.tool_name = trigger.toolName;
  if (trigger.notificationType)
    body.notification_type = trigger.notificationType;

  return postEvent(body);
}

/** Termine la session de preview (SessionEnd) -- à appeler en quittant l'onglet Animation
 * pour ne pas laisser une preview polluer l'état agrégé après coup. */
export function endPreviewSession(): Promise<void> {
  return postEvent({
    session_id: PREVIEW_SESSION_ID,
    hook_event_name: "SessionEnd",
  });
}
