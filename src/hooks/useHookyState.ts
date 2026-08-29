import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import type { AnimationName } from "../components/Avatar";

// Contrat fixe avec le backend Rust : event "hooky-state", payload { state, lastEvent,
// toolName, notificationType, sequence }. lastEvent/toolName/notificationType absents pour
// les émissions du reaper (pas d'event Claude Code à l'origine).
interface HookyStatePayload {
  state: AnimationName;
  lastEvent?: string;
  toolName?: string;
  notificationType?: string;
  /** Numéro de séquence attribué par le backend à CHAQUE émission (cf. lib.rs
   * `next_sequence`) -- source de vérité pour `revision`, cf. commentaire plus bas. */
  sequence: number;
}

export interface HookyState {
  animation: AnimationName;
  lastEvent?: string;
  toolName?: string;
  /** Uniquement présent quand `lastEvent === "Notification"` -- permet de distinguer
   * les notification_type entre eux (icône du badge, cf. animationCatalog.findMappingEntry). */
  notificationType?: string;
  /** Reflète `sequence` (backend) -- change à chaque émission, même si `animation` ne
   * change pas, pour rejouer un effet ponctuel (confettis, bounce) à chaque hook plutôt
   * qu'une seule fois par transition d'état (ex: deux `Stop` consécutifs sans event
   * intermédiaire). Volontairement PAS un compteur local (`prev.revision + 1`, ancienne
   * version) : React.StrictMode double-invoque le setup async de l'effet ci-dessous
   * (mount -> cleanup -> remount) -- le premier `listen()` ne peut être désabonné
   * qu'après résolution de sa promesse, laissant une brève fenêtre où DEUX listeners
   * réels sont actifs. Si une seule émission Rust y arrive, elle est reçue deux fois
   * côté JS ; avec un `+1` local ça produisait deux `revision` différents (donc deux
   * rendus, deux sons/bulles pour un seul Stop réel). Avec la séquence du backend comme
   * source de vérité, les deux livraisons portent la MÊME valeur -- cf. la vérification
   * dans `setState` ci-dessous qui les déduplique. */
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
      setState((prev) => {
        // Même émission déjà traitée (double listener StrictMode, cf. commentaire sur
        // `revision`) -- retourner `prev` inchangé fait bail out React (pas de re-render).
        if (prev.revision === event.payload.sequence) return prev;
        return {
          animation: event.payload.state,
          lastEvent: event.payload.lastEvent,
          toolName: event.payload.toolName,
          notificationType: event.payload.notificationType,
          revision: event.payload.sequence,
        };
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
