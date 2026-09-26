import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { availableMonitors, currentMonitor } from "@tauri-apps/api/window";
import {
  CONTEXT_MENU_PADDING,
  CONTEXT_MENU_WIDTH,
  CONTEXT_MENU_HEIGHT,
  CONTEXT_MENU_WINDOW_HEIGHT,
  CONTEXT_MENU_WINDOW_WIDTH,
  EDGE_PADDING,
} from "./layout";
import { unionBounds } from "./windowDrag";

/** Ouvre le menu contextuel du pet (clic droit) au curseur.
 *
 * Fenêtre Tauri dédiée ("menu") plutôt qu'un menu rendu dans "main" : la fenêtre du pet ne
 * fait que la taille de l'avatar (+ marge), un menu y serait rogné. Même approche que la
 * bulle de notification (cf. bubbleWindow.ts) -- fenêtre transparente sans décoration, qui
 * se ferme d'elle-même (cf. ContextMenuWindow).
 *
 * Positionnée comme un menu natif : coin haut-gauche du menu sur le curseur, retourné
 * vers la gauche / le haut si le bord de la zone utile de l'écran le couperait. `screenX`/
 * `screenY` (px logiques) sont le même repère que celui du drag (cf. windowDrag.ts). */
export async function spawnContextMenuWindow(
  screenX: number,
  screenY: number,
): Promise<void> {
  const existing = await WebviewWindow.getByLabel("menu");
  if (existing) {
    await existing.close();
  }

  const [monitor, monitors] = await Promise.all([
    currentMonitor(),
    availableMonitors(),
  ]);
  if (!monitor) return;

  const scale = monitor.scaleFactor;
  const bounds = unionBounds(
    monitors.map((m) => {
      const pos = m.workArea.position.toLogical(scale);
      const size = m.workArea.size.toLogical(scale);
      return { x: pos.x, y: pos.y, width: size.width, height: size.height };
    }),
  );
  if (!bounds) return;

  const flipX = screenX + CONTEXT_MENU_WIDTH > bounds.maxX - EDGE_PADDING;
  const flipY = screenY + CONTEXT_MENU_HEIGHT > bounds.maxY - EDGE_PADDING;

  // Le menu occupe [PADDING, PADDING + taille] dans sa fenêtre : on recule la fenêtre de
  // PADDING pour que le coin du MENU (pas de la fenêtre) tombe sur le curseur.
  const x = flipX
    ? screenX - CONTEXT_MENU_WIDTH - CONTEXT_MENU_PADDING
    : screenX - CONTEXT_MENU_PADDING;
  const y = flipY
    ? screenY - CONTEXT_MENU_HEIGHT - CONTEXT_MENU_PADDING
    : screenY - CONTEXT_MENU_PADDING;

  new WebviewWindow("menu", {
    x,
    y,
    width: CONTEXT_MENU_WINDOW_WIDTH,
    height: CONTEXT_MENU_WINDOW_HEIGHT,
    transparent: true,
    decorations: false,
    shadow: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    focus: true,
  });
}
