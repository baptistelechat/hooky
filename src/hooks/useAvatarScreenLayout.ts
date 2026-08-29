import { currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";
import type { PhysicalPosition } from "@tauri-apps/api/dpi";
import { useEffect, useRef, useState } from "react";
import {
  avatarCenterOffsetY,
  BUBBLE_MAX_WIDTH,
  BUBBLE_ZONE_HEIGHT,
  WINDOW_WIDTH,
} from "../lib/layout";

export interface AvatarScreenLayout {
  /** `true` quand il ne reste plus `BUBBLE_ZONE_HEIGHT` de place au-dessus de l'AVATAR (pas
   * de la fenêtre, qui peut déborder sans conséquence, cf. `evaluate`) -- déclenche le flip
   * de NotificationBubble (bulle sous l'avatar plutôt qu'au-dessus, cf. Avatar.tsx). */
  flipped: boolean;
  /** Décalage horizontal (px logiques, 0 = centré) à appliquer à la bulle pour qu'elle
   * reste entièrement visible quand la fenêtre déborde à gauche/droite du moniteur (cf.
   * startClampedDrag -- l'avatar peut désormais aller plus près du bord que la bulle, plus
   * large, ne le permettrait toute seule). La pointe compense ce décalage pour rester sur
   * l'avatar (cf. NotificationBubble). */
  shiftX: number;
  /** À appeler par `startClampedDrag` (windowDrag.ts) à CHAQUE frame de drag où le flip
   * change -- pendant un drag manuel, l'avatar suit directement la souris au pixel près
   * (cf. windowDrag.ts) et `flipped` en est dérivé en continu ; ce setter propage cette
   * valeur au state React immédiatement, sans attendre l'aller-retour async `onMoved` (qui
   * reste la seule source pour les cas HORS drag : montage initial, action "Recentrer la
   * fenêtre", changement de moniteur). */
  applyFlippedFromDrag: (next: boolean) => void;
}

/** Bascule la bulle sous l'avatar plutôt qu'au-dessus quand il ne reste plus assez de place
 * pour la bulle AU-DESSUS de l'AVATAR, et calcule son décalage horizontal (façon Popover
 * avec détection de collision, cf. NotificationBubble) -- purement visuel, sans effet de
 * bord : l'avatar reste TOUJOURS centré dans la fenêtre (`avatarCenterOffsetY`,
 * indépendant de `flipped`, cf. layout.ts) -- un flip ne déplace donc jamais la fenêtre, cf.
 * mémoire projet (l'ancien schéma, où l'offset de l'avatar dépendait de `flipped`,
 * nécessitait un repositionnement de fenêtre synchronisé avec le changement CSS, toujours
 * légèrement en retard -- IPC Tauri oblige -- d'où un flash inévitable). Le clamp qui
 * empêche l'avatar lui-même de déborder est géré séparément, DURANT le drag, par
 * `startClampedDrag` (cf. src/lib/windowDrag.ts et Avatar.tsx). */
export function useAvatarScreenLayout(avatarSize: number): AvatarScreenLayout {
  const [flipped, setFlipped] = useState(false);
  const [shiftX, setShiftX] = useState(0);
  // Lu dans `evaluate` (déclenché par `onMoved`, souscrit une seule fois -- cf. `[]` plus
  // bas) sans avoir à réabonner l'écouteur à chaque changement d'`avatarSize` (slider
  // Settings, cf. Avatar.tsx).
  const avatarSizeRef = useRef(avatarSize);
  useEffect(() => {
    avatarSizeRef.current = avatarSize;
  }, [avatarSize]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    const win = getCurrentWindow();

    const evaluate = async (pos: PhysicalPosition) => {
      const monitor = await currentMonitor().catch((error: unknown) => {
        console.error("[useAvatarScreenLayout] currentMonitor échoué", error);
        return null;
      });
      if (cancelled || !monitor) return;
      const scale = monitor.scaleFactor;

      // L'avatar est TOUJOURS centré dans la fenêtre (cf. `avatarCenterOffsetY`,
      // indépendant de `flipped`) -- sa position réelle à l'écran ne dépend donc que de
      // `pos.y` et `avatarSize`, jamais de l'état de flip courant (contrairement à
      // l'ancien schéma, cf. mémoire projet : plus de dépendance circulaire possible).
      const avatarTop =
        pos.y + avatarCenterOffsetY(avatarSizeRef.current) * scale;
      const computedFlipped =
        avatarTop - monitor.position.y < BUBBLE_ZONE_HEIGHT * scale;
      setFlipped(computedFlipped);

      // Débordement de la BULLE elle-même (centrée dans la fenêtre, largeur fixe
      // BUBBLE_MAX_WIDTH -- cf. layout.ts), pas de toute la fenêtre : celle-ci est
      // volontairement bien plus large que la bulle (pour laisser à l'avatar la place
      // d'aller flush au bord de l'écran, cf. startClampedDrag), donc son propre
      // débordement est presque toujours bien plus grand que ce dont la bulle a réellement
      // besoin pour rester visible -- l'utiliser décalait la bulle bien trop loin de
      // l'avatar.
      const bubbleCenterX = pos.x + (WINDOW_WIDTH / 2) * scale;
      const halfBubble = (BUBBLE_MAX_WIDTH / 2) * scale;
      const overflowLeft = Math.max(
        0,
        monitor.position.x - (bubbleCenterX - halfBubble),
      );
      const overflowRight = Math.max(
        0,
        bubbleCenterX + halfBubble - (monitor.position.x + monitor.size.width),
      );
      setShiftX((overflowLeft - overflowRight) / scale);
    };

    win
      .outerPosition()
      .then((pos) => {
        if (!cancelled) void evaluate(pos);
      })
      .catch((error: unknown) =>
        console.error("[useAvatarScreenLayout] outerPosition échoué", error),
      );

    win
      .onMoved(({ payload }) => void evaluate(payload))
      .then((fn) => {
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

  return {
    flipped,
    shiftX,
    applyFlippedFromDrag: setFlipped,
  };
}
