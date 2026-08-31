import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef } from "react";
import {
  BUBBLE_MAX_WIDTH,
  BUBBLE_WINDOW_WIDTH,
  EDGE_PADDING,
} from "../lib/layout";
import { pickNotificationMessage } from "../lib/notificationMessages";

interface BubbleWindowParams {
  lastEvent?: string;
  notificationType?: string;
  revision: number;
  avatarSize: number;
  notificationsEnabled: boolean;
  callName: string;
}

/** Décide si une fenêtre "bubble" doit être spawnée pour la notification courante. Ne
 * calcule QUE ce qui ne dépend pas de la hauteur réelle du message -- position X (toujours
 * centrée sur l'avatar, jamais clampée -- cf. layout.ts, `BUBBLE_WINDOW_WIDTH`), `shiftX`
 * (décalage du CORPS de la bulle pour rester visible à l'écran même avatar collé à un bord)
 * et les bords haut/bas de l'avatar/du moniteur. Le choix au-dessus/en-dessous et la
 * position Y finale sont décidés par la fenêtre "bubble" elle-même, une fois qu'elle connaît
 * sa propre hauteur mesurée (cf. NotificationBubbleWindow) : décider "flipped" ici, à partir
 * d'un seuil fixe devinant la hauteur de la bulle, pouvait choisir "assez de place au-dessus"
 * alors que la bulle réelle (plus haute que le seuil deviné) débordait quand même hors
 * écran -- plus de seuil à deviner, la fenêtre a l'information exacte au moment de décider.
 *
 * Calcule tout ça UNE SEULE FOIS au moment du spawn -- jamais réévalué en continu
 * (contrairement à l'ancienne bulle intégrée à "main", cf. mémoire projet) : l'avatar n'a
 * pas bougé entre deux notifications, aucune raison de recalculer tant qu'aucun drag n'a eu
 * lieu (cf. windowDrag.ts, qui ferme la bulle dès qu'un drag démarre plutôt que de la faire
 * suivre). Si une fenêtre bulle existe déjà (ex: deux notifications rapprochées), ne fait
 * rien de plus -- elle écoute elle-même le même event `hooky-state` (cf.
 * NotificationBubbleWindow) et se met à jour seule, sans repositionnement.
 */
export function useBubbleWindow({
  lastEvent,
  notificationType,
  revision,
  avatarSize,
  notificationsEnabled,
  callName,
}: BubbleWindowParams): void {
  // Lus dans l'effet ci-dessous (déclenché uniquement par `revision`, cf. plus bas) sans
  // avoir à le réabonner à chaque changement de ces valeurs.
  const latestRef = useRef({ avatarSize, notificationsEnabled, callName });
  useEffect(() => {
    latestRef.current = { avatarSize, notificationsEnabled, callName };
  }, [avatarSize, notificationsEnabled, callName]);

  // Anti-double-spawn : React.StrictMode double-invoque cet effet en dev (même piège que
  // useHookyState, cf. mémoire projet) -- sans ce garde, deux `WebviewWindow("bubble")`
  // pourraient être créées pour la même notification.
  const handledRevisionRef = useRef<number | null>(null);

  useEffect(() => {
    if (handledRevisionRef.current === revision) return;
    handledRevisionRef.current = revision;

    const { avatarSize, notificationsEnabled, callName } = latestRef.current;
    if (!notificationsEnabled) return;

    const message = pickNotificationMessage(
      lastEvent,
      notificationType,
      callName,
    );
    if (!message) return;

    void (async () => {
      const existing = await WebviewWindow.getByLabel("bubble").catch(
        () => null,
      );
      if (existing) return;

      const win = getCurrentWindow();
      const [posPhysical, monitor] = await Promise.all([
        win.outerPosition(),
        currentMonitor(),
      ]).catch((error: unknown) => {
        console.error(
          "[useBubbleWindow] lecture position/moniteur échouée",
          error,
        );
        return [null, null] as const;
      });
      if (!posPhysical || !monitor) return;

      const scale = monitor.scaleFactor;
      // Position/taille de "main" == position/taille de l'avatar, aucune marge (cf.
      // Avatar.tsx/windowDrag.ts -- la fenêtre "main" est dimensionnée EXACTEMENT à
      // `avatarSize`).
      const posLogical = posPhysical.toLogical(scale);
      const avatarTop = posLogical.y;
      const avatarBottom = avatarTop + avatarSize;
      const avatarCenterX = posLogical.x + avatarSize / 2;
      const monitorPos = monitor.position.toLogical(scale);
      const monitorSize = monitor.size.toLogical(scale);

      // Fenêtre TOUJOURS centrée sur l'avatar, jamais clampée (cf. layout.ts,
      // `BUBBLE_WINDOW_WIDTH`) -- seul le CORPS de la bulle (`BUBBLE_MAX_WIDTH`, bien plus
      // étroit) doit rester visible à l'écran : `shiftX` compense l'éventuel débordement de
      // ce corps (centré sur l'avatar par défaut) contre les bords du moniteur, exactement
      // comme l'ancienne bulle intégrée à "main" (cf. mémoire projet).
      const bubbleX = avatarCenterX - BUBBLE_WINDOW_WIDTH / 2;
      const halfBubble = BUBBLE_MAX_WIDTH / 2;
      // `EDGE_PADDING` (cf. layout.ts) : même marge de sécurité que le drag de l'avatar, pour
      // que le corps de la bulle ne colle jamais pile contre le bord de l'écran non plus.
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

      // Le message est transmis directement via l'URL de la fenêtre : au moment où CETTE
      // fenêtre existe et pourrait écouter `hooky-state` elle-même, l'event qui a causé son
      // spawn a déjà été émis (par définition -- c'est lui qui a déclenché ce spawn) et ne
      // sera donc JAMAIS reçu par son propre listener (Tauri n'a pas de rejeu d'events
      // passés pour un listener tardif). Sans ce contournement, la fenêtre s'ouvrait vide au
      // premier message et ne s'affichait correctement qu'à partir de la DEUXIÈME
      // notification -- cf. NotificationBubbleWindow, qui affiche ce message initial au
      // montage puis continue d'écouter `hooky-state` normalement pour les notifications
      // suivantes. `avatarTop`/`avatarBottom`/`monitorTop` lui donnent tout ce qu'il faut
      // pour décider elle-même au-dessus/en-dessous une fois sa propre hauteur connue.
      const params = new URLSearchParams({
        bubbleText: message,
        bubbleLastEvent: lastEvent ?? "",
        bubbleX: String(bubbleX),
        bubbleShiftX: String(shiftX),
        avatarTop: String(avatarTop),
        avatarBottom: String(avatarBottom),
        monitorTop: String(monitorPos.y),
      });

      new WebviewWindow("bubble", {
        url: `/?${params.toString()}`,
        // Placeholder invisible -- corrigé (hauteur + position Y) par la fenêtre elle-même
        // une fois sa hauteur réelle mesurée, avant son premier `show()` (cf.
        // NotificationBubbleWindow). X ne change jamais après coup (largeur fixe).
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
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);
}
