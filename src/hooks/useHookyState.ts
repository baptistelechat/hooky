import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import type { AnimationName } from "../components/Avatar";

// Contrat fixe avec le backend Rust : event "hooky-state", payload { state, lastEvent,
// toolName, notificationType }. Tous absents pour les émissions du reaper (pas d'event
// Claude Code à l'origine).
interface HookyStatePayload {
  state: AnimationName;
  lastEvent?: string;
  toolName?: string;
  notificationType?: string;
}

export interface HookyState {
  animation: AnimationName;
  lastEvent?: string;
  toolName?: string;
  /** Uniquement présent quand `lastEvent === "Notification"` -- permet de distinguer
   * les notification_type entre eux (icône du badge, cf. animationCatalog.findMappingEntry). */
  notificationType?: string;
  /** Incrémenté à chaque émission backend, même si `animation` ne change pas -- permet
   * de rejouer un effet ponctuel (confettis, bounce) à chaque hook plutôt qu'une seule
   * fois par transition d'état (ex: deux `Stop` consécutifs sans event intermédiaire). */
  revision: number;
}

/** Écoute l'event Tauri "hooky-state" émis par le backend Rust et retourne l'état courant
 * (animation + hook déclencheur, ce dernier utilisé uniquement par le mode debug). */
export function useHookyState(initial: AnimationName = "sleeping"): HookyState {
  const [state, setState] = useState<HookyState>({
    animation: initial,
    revision: 0,
  });

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    listen<HookyStatePayload>("hooky-state", (event) => {
      setState((prev) => ({
        animation: event.payload.state,
        lastEvent: event.payload.lastEvent,
        toolName: event.payload.toolName,
        notificationType: event.payload.notificationType,
        revision: prev.revision + 1,
      }));
    }).then((fn) => {
      // Le composant a pu démonter avant résolution de la promesse : ne pas
      // laisser un listener actif, désabonner immédiatement.
      if (cancelled) {
        fn();
      } else {
        unlisten = fn;
      }
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  return state;
}
