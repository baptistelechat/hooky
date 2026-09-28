import { useEffect, useRef } from "react";
import { spawnBubbleWindow } from "../lib/bubbleWindow";
import { pickNotificationMessage } from "../lib/notificationMessages";

interface BubbleWindowParams {
  lastEvent?: string;
  notificationType?: string;
  revision: number;
  avatarSize: number;
  notificationsEnabled: boolean;
  callName: string;
}

/** Décide si une fenêtre "bubble" doit être spawnée pour la notification courante --
 * délègue le calcul position/taille et le spawn lui-même à `spawnBubbleWindow` (cf.
 * lib/bubbleWindow.ts, aussi utilisé par le survol de l'avatar pour les stats Claude
 * Code). Ne fait ici que traduire l'event hook courant en message affichable (ou rien).
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

    void spawnBubbleWindow({ text: message, avatarSize });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);
}
