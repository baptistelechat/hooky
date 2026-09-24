import { cursorPosition, getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState, type RefObject } from "react";
import { gazeIndexFor } from "../lib/codexPets";

const POLL_MS = 100;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
// Hystérésis (px logiques, depuis le centre du pet) : réveil plus près que l'endormissement,
// sinon le pet clignote quand le curseur reste au bord du rayon (réglage à l'œil, cf. roadmap
// étape 13).
const WAKE_RADIUS = 260;
const SLEEP_RADIUS = 340;
// Délai passé hors du rayon avant de se rendormir : le pet continue de suivre le curseur pendant
// ce temps, pour une vraie transition plutôt qu'un retour sec au sommeil.
const SLEEP_DELAY_MS = 1200;

/** Pose de regard (0..15) vers le curseur tant que `active` et que le curseur est dans le
 * rayon de réveil, `null` sinon. Le curseur est lu par polling de la position GLOBALE (le
 * rayon dépasse la fenêtre, et `setIgnoreCursorEvents` n'est pas fiable sur Windows, cf.
 * LRN-043) -- uniquement tant que `active` : le polling s'arrête dès qu'un hook sort le pet de
 * `sleeping`. `prefers-reduced-motion` désactive le regard. */
export function useCursorGaze(
  centerRef: RefObject<HTMLElement | null>,
  active: boolean,
): number | null {
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!active || window.matchMedia(REDUCED_MOTION).matches) return;

    let cancelled = false;
    let awake = false;
    let outSince: number | null = null;
    let busy = false; // pas de lecture qui en chevauche une autre si l'IPC traîne

    const tick = async () => {
      const el = centerRef.current;
      if (el && !busy) {
        busy = true;
        try {
          const [cursor, origin] = await Promise.all([
            cursorPosition(),
            getCurrentWindow().outerPosition(),
          ]);
          if (cancelled) return;
          const rect = el.getBoundingClientRect();
          const scale = window.devicePixelRatio;
          // Écran, en px physiques -> px logiques : distance au centre du pet.
          const dx =
            (cursor.x - origin.x) / scale - (rect.left + rect.width / 2);
          const dy =
            (cursor.y - origin.y) / scale - (rect.top + rect.height / 2);
          const inside =
            Math.hypot(dx, dy) < (awake ? SLEEP_RADIUS : WAKE_RADIUS);
          if (inside) {
            awake = true;
            outSince = null;
          } else if (awake) {
            outSince ??= Date.now();
            if (Date.now() - outSince >= SLEEP_DELAY_MS) awake = false;
          }
          setIndex(awake ? gazeIndexFor(dx, dy) : null);
        } catch (error) {
          console.error("[useCursorGaze] lecture du curseur échouée", error);
        } finally {
          busy = false;
        }
      }
    };
    const timer = setInterval(() => void tick(), POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
      setIndex(null);
    };
  }, [active, centerRef]);

  return index;
}
