import { LogicalPosition } from "@tauri-apps/api/dpi";
import { currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";
import {
  avatarCenterOffsetY,
  BUBBLE_ZONE_HEIGHT,
  WINDOW_WIDTH,
} from "./layout";

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
 * PRINCIPE : on calcule directement la position ABSOLUE DE L'AVATAR à l'écran depuis le
 * delta souris -- l'avatar suit donc le curseur au pixel près PAR CONSTRUCTION, à chaque
 * frame. L'avatar est TOUJOURS centré dans la fenêtre (`avatarCenterOffsetY`, cf. layout.ts
 * -- INDÉPENDANT de `flipped`) : la position de la FENÊTRE (`avatarY - avatarCenterOffsetY`)
 * ne dépend donc JAMAIS du flip -- un flip ne provoque plus aucun repositionnement de
 * fenêtre, seulement un changement CSS local sur la bulle (cf. Avatar.tsx). C'est ce qui
 * élimine le flash constaté avec le schéma précédent (offset d'avatar dépendant de
 * `flipped`, nécessitant un `setPosition()` compensatoire à chaque flip -- toujours en
 * léger retard sur la mise à jour CSS synchrone, l'IPC Tauri n'étant jamais instantané, cf.
 * mémoire projet).
 */
export function startClampedDrag(
  startScreenX: number,
  startScreenY: number,
  avatarSize: number,
  flipped: boolean,
  onFlipChange: (flipped: boolean) => void,
): void {
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
    const marginH = (WINDOW_WIDTH - avatarSize) / 2;
    const offsetY = avatarCenterOffsetY(avatarSize);

    // Position ABSOLUE de l'avatar (pas de la fenêtre) au début du drag -- ancre à partir
    // de laquelle le delta souris est appliqué tout du long. L'avatar étant TOUJOURS centré
    // (offset indépendant de `flipped`), cette ancre ne dépend plus du flip courant.
    const avatarStartX = startWin.x + marginH;
    const avatarStartY = startWin.y + offsetY;

    // Bornes directes sur la position de l'avatar : le bord réel de l'écran moins
    // `avatarSize`, un seul calcul par axe -- l'avatar EST la chose qu'on clampe, pas une
    // fenêtre dont il faudrait déduire son propre bord.
    const avatarMinX = monitorPos.x;
    const avatarMaxX = monitorPos.x + monitorSize.width - avatarSize;
    const avatarMinY = monitorPos.y;
    const avatarMaxY = monitorPos.y + monitorSize.height - avatarSize;

    let rafId: number | null = null;
    let lastFlipped = flipped;
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
      const avatarX = Math.min(
        Math.max(avatarStartX + (moveEvent.screenX - startScreenX), avatarMinX),
        avatarMaxX,
      );
      const avatarY = Math.min(
        Math.max(avatarStartY + (moveEvent.screenY - startScreenY), avatarMinY),
        avatarMaxY,
      );

      // Recalculé à CHAQUE frame (pas gelé) : purement pour piloter l'affichage de la
      // bulle (cf. `onFlipChange`) -- n'a plus AUCUN effet sur la position de la fenêtre
      // (`offsetY` est constant, cf. plus haut), donc plus aucun risque de désynchroniser
      // l'avatar du curseur, quelle que soit la fréquence des changements de flip.
      const nextFlipped = avatarY - monitorPos.y < BUBBLE_ZONE_HEIGHT;
      if (nextFlipped !== lastFlipped) {
        lastFlipped = nextFlipped;
        onFlipChange(nextFlipped);
      }

      pendingX = avatarX - marginH;
      pendingY = avatarY - offsetY;
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
