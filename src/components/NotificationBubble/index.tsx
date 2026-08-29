import { useEffect, useRef, useState } from "react";
import notificationSoundUrl from "../../assets/sounds/notification.wav";
import startSoundUrl from "../../assets/sounds/start.wav";
import stopSoundUrl from "../../assets/sounds/stop.wav";
import { useHookyState } from "../../hooks/useHookyState";
import { useSettings } from "../../hooks/useSettings";
import { pickNotificationMessage } from "../../lib/notificationMessages";
import { bubbleBottomOffset } from "../../lib/layout";

const DISPLAY_DURATION_MS = 6000;

/**
 * Rendue dans la fenêtre "main" (au-dessus de l'avatar, cf. Avatar.tsx) -- plus une
 * fenêtre Tauri séparée (ancienne archi, cf. BDR-035 en mémoire projet). Purement
 * synchrone : `revision` (useHookyState) déclenche directement le show/hide en state
 * React, sans jamais passer par une position de fenêtre à recalculer -- élimine du même
 * coup la race qui laissait parfois une bulle vide affichée indéfiniment (l'ancien effet
 * async pouvait terminer -- et appeler `show()`/rejouer le son -- après avoir déjà été
 * "annulé" par un event suivant, faute d'un check juste avant l'appel final).
 */
export function NotificationBubble() {
  const { lastEvent, notificationType, revision } = useHookyState();
  const [settings] = useSettings();
  const [text, setText] = useState<string | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // React.StrictMode (main.tsx) double-invoque volontairement CHAQUE effet en dev (mount ->
  // cleanup -> remount, cf. doc React) -- sans cleanup ici (setText/play() ne s'annulent
  // pas comme une animation WAAPI), les deux invocations rejouaient le son et pouvaient
  // afficher deux phrases différentes (pickNotificationMessage tire au hasard). Ce ref
  // retient le dernier `revision` déjà traité pour ignorer la 2e invocation immédiate.
  const handledRevisionRef = useRef<number | null>(null);

  // Dépend uniquement de `revision` : incrémenté à CHAQUE event backend (cf.
  // useHookyState), donc `lastEvent`/`notificationType` sont déjà à jour dans le même
  // render -- pas besoin de les lister, et ça évite de rejouer l'effet sur un simple
  // changement de `settings` (ex: toggle du réglage pendant qu'une bulle est affichée).
  useEffect(() => {
    if (handledRevisionRef.current === revision) return;
    handledRevisionRef.current = revision;

    if (!settings.notificationsEnabled) return;

    // SessionStart : son seul, pas de bulle (cf. pickNotificationMessage -- hors périmètre).
    if (lastEvent === "SessionStart") {
      void new Audio(startSoundUrl).play().catch(() => {});
      return;
    }

    const message = pickNotificationMessage(lastEvent, notificationType);
    if (!message) return;

    // Réagit à un event externe (revision, IPC Tauri via useHookyState) -- pas un dérivé
    // de state React local, cf. règle react-hooks/set-state-in-effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(message);
    const soundUrl = lastEvent === "Stop" ? stopSoundUrl : notificationSoundUrl;
    void new Audio(soundUrl).play().catch(() => {});

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setText(null), DISPLAY_DURATION_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  useEffect(
    () => () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    },
    [],
  );

  // Ancrée au bord RÉEL du haut de l'avatar (dépend de `avatarSize`, qui varie via
  // Settings), pas au bord d'un slot fixe -- sinon un avatar réduit laisse un vide entre
  // la bulle et l'avatar (l'avatar reste centré dans son carré fixe, cf. Avatar.tsx).
  return (
    <div
      className="pointer-events-none absolute inset-x-0 flex justify-center px-2"
      style={{ bottom: bubbleBottomOffset(settings.avatarSize) }}
    >
      <div
        className={`max-w-full cursor-grab rounded-2xl border bg-popover px-4 py-3 text-center text-sm text-popover-foreground shadow-lg transition-[opacity,transform] duration-200 ease-out active:cursor-grabbing ${
          text
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-1 opacity-0"
        }`}
      >
        {text}
      </div>
    </div>
  );
}
