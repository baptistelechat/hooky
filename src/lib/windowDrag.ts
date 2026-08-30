import { LogicalPosition } from "@tauri-apps/api/dpi";
import { emit } from "@tauri-apps/api/event";
import { currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Déplace la fenêtre "main" à la main (mousemove/mouseup globaux + `setPosition()`) au lieu
 * du `startDragging()` natif Tauri. Constaté en test réel (avatar/fenêtre restant croppés
 * après plusieurs tentatives de correction) : la boucle de déplacement interactive de l'OS
 * déclenchée par `startDragging()` garde la main sur la position de la fenêtre pendant TOUT
 * le drag, écrasant systématiquement toute correction tentée depuis JS pendant ce temps --
 * y compris une fois la promesse de `startDragging()` résolue, puisqu'elle se résout dès le
 * LANCEMENT du drag, pas à la fin (limitation connue, cf. tauri-apps/tauri#4825, "not
 * planned"). En pilotant nous-mêmes chaque mise à jour de position, il n'existe plus de
 * boucle OS concurrente à écraser.
 *
 * L'avatar remplit désormais EXACTEMENT toute la fenêtre "main" (plus de marge -- la
 * position de la fenêtre EST la position de l'avatar) -- il n'y a plus de bulle à faire
 * basculer dans cette fenêtre (elle vit dans sa propre fenêtre Tauri, cf. useBubbleWindow),
 * donc plus de calcul de flip ici. Un événement
 * `hooky-bubble-dismiss` est émis une seule fois au tout début du drag pour que la fenêtre
 * bulle (si une existe) se ferme proprement plutôt que de tenter de la faire suivre l'avatar
 * en direct -- une fenêtre séparée qui suit en continu une autre fenêtre en cours de
 * déplacement accumule le même retard structurel IPC-vs-CSS documenté par ailleurs sur ce
 * projet (cf. mémoire projet, CSS synchrone vs repositionnement fenêtre OS asynchrone).
 */
export function startClampedDrag(
  startScreenX: number,
  startScreenY: number,
  avatarSize: number,
): void {
  void emit("hooky-bubble-dismiss");

  const win = getCurrentWindow();

  void (async () => {
    const [startPosPhysical, monitor] = await Promise.all([
      win.outerPosition(),
      currentMonitor(),
    ]).catch((error: unknown) => {
      console.error(
        "[startClampedDrag] lecture position/moniteur échouée",
        error,
      );
      return [null, null] as const;
    });
    if (!startPosPhysical || !monitor) return;

    const scale = monitor.scaleFactor;
    const startWin = startPosPhysical.toLogical(scale);
    const monitorPos = monitor.position.toLogical(scale);
    const monitorSize = monitor.size.toLogical(scale);

    // Bornes directes sur la position de la fenêtre (= position de l'avatar, aucune marge) :
    // le bord réel de l'écran moins `avatarSize`, un seul calcul par axe.
    const avatarMinX = monitorPos.x;
    const avatarMaxX = monitorPos.x + monitorSize.width - avatarSize;
    const avatarMinY = monitorPos.y;
    const avatarMaxY = monitorPos.y + monitorSize.height - avatarSize;

    let rafId: number | null = null;
    let pendingX = startWin.x;
    let pendingY = startWin.y;

    const applyPendingPosition = () => {
      rafId = null;
      win
        .setPosition(new LogicalPosition(pendingX, pendingY))
        .catch((error: unknown) =>
          console.error("[startClampedDrag] setPosition échoué", error),
        );
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      pendingX = Math.min(
        Math.max(startWin.x + (moveEvent.screenX - startScreenX), avatarMinX),
        avatarMaxX,
      );
      pendingY = Math.min(
        Math.max(startWin.y + (moveEvent.screenY - startScreenY), avatarMinY),
        avatarMaxY,
      );
      // Coalesce les mousemove (peuvent arriver bien plus vite que 60Hz) en un seul
      // `setPosition()` par frame -- chaque appel est un aller-retour IPC vers le backend
      // Rust, en envoyer un par event serait inutilement coûteux et saccaderait le drag.
      if (rafId === null) rafId = requestAnimationFrame(applyPendingPosition);
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  })();
}
