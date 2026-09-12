import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";
import {
  AVATAR_SHADOW_GAP,
  BUBBLE_MAX_WIDTH,
  BUBBLE_WINDOW_WIDTH,
  EDGE_PADDING,
  avatarWindowSize,
} from "./layout";

interface SpawnBubbleWindowParams {
  text: string;
  avatarSize: number;
  lastEvent?: string;
}

/** Calcule la position/taille initiale de la fenêtre "bubble" (centrée sur l'avatar,
 * jamais clampée au moniteur -- seul le CORPS de la bulle doit rester visible, cf.
 * `shiftX`) et la spawn si aucune n'est déjà ouverte. Extrait de `useBubbleWindow` pour
 * isoler cette mécanique de positionnement multi-écran de la logique "quel message
 * afficher" -- un seul appelant pour l'instant (notifications), factorisé quand même :
 * la fonction ne fait qu'une chose (positionner/spawn), testable indépendamment.
 */
export async function spawnBubbleWindow({
  text,
  avatarSize,
  lastEvent,
}: SpawnBubbleWindowParams): Promise<void> {
  const existing = await WebviewWindow.getByLabel("bubble").catch(() => null);
  if (existing) return;

  const win = getCurrentWindow();
  const [posPhysical, monitor] = await Promise.all([
    win.outerPosition(),
    currentMonitor(),
  ]).catch((error: unknown) => {
    console.error(
      "[spawnBubbleWindow] lecture position/moniteur échouée",
      error,
    );
    return [null, null] as const;
  });
  if (!posPhysical || !monitor) return;

  const scale = monitor.scaleFactor;
  const posLogical = posPhysical.toLogical(scale);
  const windowSize = avatarWindowSize(avatarSize);
  const avatarTop = posLogical.y + AVATAR_SHADOW_GAP;
  const avatarBottom = avatarTop + avatarSize;
  const avatarCenterX = posLogical.x + windowSize / 2;
  // `workArea` (pas `position`/`size`) : exclut la barre des tâches, cf. windowDrag.ts et
  // EDGE_PADDING (layout.ts) pour le même changement côté drag de l'avatar.
  const monitorPos = monitor.workArea.position.toLogical(scale);
  const monitorSize = monitor.workArea.size.toLogical(scale);

  const bubbleX = avatarCenterX - BUBBLE_WINDOW_WIDTH / 2;
  const halfBubble = BUBBLE_MAX_WIDTH / 2;
  const overflowLeft = Math.max(
    0,
    monitorPos.x + EDGE_PADDING - (avatarCenterX - halfBubble),
  );
  const overflowRight = Math.max(
    0,
    avatarCenterX +
      halfBubble -
      (monitorPos.x + monitorSize.width - EDGE_PADDING),
  );
  const shiftX = overflowLeft - overflowRight;

  const params = new URLSearchParams({
    bubbleText: text,
    bubbleLastEvent: lastEvent ?? "",
    bubbleX: String(bubbleX),
    bubbleShiftX: String(shiftX),
    avatarTop: String(avatarTop),
    avatarBottom: String(avatarBottom),
    monitorTop: String(monitorPos.y),
  });

  new WebviewWindow("bubble", {
    url: `/?${params.toString()}`,
    // Placeholder invisible -- corrigé (hauteur + position Y) par la fenêtre elle-même une
    // fois sa hauteur réelle mesurée, avant son premier `show()` (cf.
    // NotificationBubbleWindow).
    x: bubbleX,
    y: avatarTop,
    width: BUBBLE_WINDOW_WIDTH,
    height: 10,
    visible: false,
    transparent: true,
    decorations: false,
    shadow: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    focus: false,
  });
}
