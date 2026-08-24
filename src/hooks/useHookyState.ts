import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import type { AnimationName } from "../components/Avatar";

// Contrat fixe avec le backend Rust : event "hooky-state", payload { state: <nom> }.
interface HookyStatePayload {
  state: AnimationName;
}

/** Écoute l'event Tauri "hooky-state" émis par le backend Rust et retourne l'état courant. */
export function useHookyState(
  initial: AnimationName = "sleeping",
): AnimationName {
  const [state, setState] = useState<AnimationName>(initial);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    listen<HookyStatePayload>("hooky-state", (event) => {
      setState(event.payload.state);
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
