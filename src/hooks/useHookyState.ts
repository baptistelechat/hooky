import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import type { AnimationName } from "../components/Avatar";

// Contrat fixe avec le backend Rust : event "hooky-state", payload { state, lastEvent, toolName }.
// lastEvent/toolName sont absents pour les émissions du reaper (pas d'event Claude Code à l'origine).
interface HookyStatePayload {
  state: AnimationName;
  lastEvent?: string;
  toolName?: string;
}

export interface HookyState {
  animation: AnimationName;
  lastEvent?: string;
  toolName?: string;
}

/** Écoute l'event Tauri "hooky-state" émis par le backend Rust et retourne l'état courant
 * (animation + hook déclencheur, ce dernier utilisé uniquement par le mode debug). */
export function useHookyState(initial: AnimationName = "sleeping"): HookyState {
  const [state, setState] = useState<HookyState>({ animation: initial });

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    listen<HookyStatePayload>("hooky-state", (event) => {
      setState({
        animation: event.payload.state,
        lastEvent: event.payload.lastEvent,
        toolName: event.payload.toolName,
      });
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
