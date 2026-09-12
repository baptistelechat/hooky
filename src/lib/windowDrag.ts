import { LogicalPosition } from "@tauri-apps/api/dpi";
import { emit } from "@tauri-apps/api/event";
import {
  availableMonitors,
  currentMonitor,
  getCurrentWindow,
} from "@tauri-apps/api/window";
import { EDGE_PADDING } from "./layout";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Union des bornes (min/max) d'une liste de rectangles -- extrait de `startClampedDrag`
 * en fonction pure (aucune dépendance Tauri/DOM) pour être vérifiable avec des données
 * synthétiques à plusieurs moniteurs, sans écran secondaire disponible pour tester en
 * conditions réelles (cf. mémoire projet). `null` si la liste est vide (aucun moniteur
 * détecté -- ne devrait jamais arriver en pratique, mais évite un `Infinity` qui fuiterait
 * silencieusement dans le clamp de drag). */
export function unionBounds(
  rects: Rect[],
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (rects.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }
  return { minX, minY, maxX, maxY };
}

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
 * Il n'y a plus de bulle à faire basculer dans cette fenêtre (elle vit dans sa propre
 * fenêtre Tauri, cf. useBubbleWindow), donc plus de calcul de flip ici. Un événement
 * `hooky-bubble-dismiss` est émis une seule fois au tout début du drag pour que la fenêtre
 * bulle (si une existe) se ferme proprement plutôt que de tenter de la faire suivre l'avatar
 * en direct -- une fenêtre séparée qui suit en continu une autre fenêtre en cours de
 * déplacement accumule le même retard structurel IPC-vs-CSS documenté par ailleurs sur ce
 * projet (cf. mémoire projet, CSS synchrone vs repositionnement fenêtre OS asynchrone).
 */
export function startClampedDrag(
  startScreenX: number,
  startScreenY: number,
  windowWidth: number,
  windowHeight: number,
): void {
  void emit("hooky-bubble-dismiss");

  const win = getCurrentWindow();

  void (async () => {
    const [startPosPhysical, monitor, monitors] = await Promise.all([
      win.outerPosition(),
      currentMonitor(),
      availableMonitors(),
    ]).catch((error: unknown) => {
      console.error(
        "[startClampedDrag] lecture position/moniteur échouée",
        error,
      );
      return [null, null, null] as const;
    });
    if (!startPosPhysical || !monitor || !monitors) return;

    const scale = monitor.scaleFactor;
    const startWin = startPosPhysical.toLogical(scale);

    // Bornes sur l'union de TOUS les moniteurs (bureau virtuel), pas seulement celui où le
    // drag démarre -- `currentMonitor()` seul bloquait l'avatar sur son écran d'origine en
    // config multi-écran. Converties avec le `scale` du moniteur de départ (cf. `scale`
    // ci-dessus) : approximation suffisante tant que les moniteurs partagent le même DPI,
    // qui reste le cas courant. `workArea` (pas `position`/`size`) : exclut la barre des
    // tâches de CE moniteur quelle que soit sa position (haut/bas/côté), contrairement à
    // la résolution physique -- cf. EDGE_PADDING dans layout.ts.
    const bounds = unionBounds(
      monitors.map((m) => {
        const pos = m.workArea.position.toLogical(scale);
        const size = m.workArea.size.toLogical(scale);
        return { x: pos.x, y: pos.y, width: size.width, height: size.height };
      }),
    );
    if (!bounds) return;
    const {
      minX: virtualMinX,
      minY: virtualMinY,
      maxX: virtualMaxX,
      maxY: virtualMaxY,
    } = bounds;

    // Bornes sur la position de la fenêtre : le bord réel du bureau virtuel moins la
    // taille réelle de la fenêtre "main" (cf. layout.ts `avatarWindowWidth`/
    // `avatarWindowSize` -- plus grande que l'avatar lui-même depuis `AVATAR_SHADOW_GAP`,
    // et plus large encore quand le panneau de quotas est activé), avec `EDGE_PADDING`
    // pour ne jamais coller la fenêtre pile contre le bord de l'écran. Largeur/hauteur
    // distinctes depuis que la fenêtre n'est plus forcément carrée.
    const avatarMinX = virtualMinX + EDGE_PADDING;
    const avatarMaxX = virtualMaxX - windowWidth - EDGE_PADDING;
    const avatarMinY = virtualMinY + EDGE_PADDING;
    const avatarMaxY = virtualMaxY - windowHeight - EDGE_PADDING;

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
