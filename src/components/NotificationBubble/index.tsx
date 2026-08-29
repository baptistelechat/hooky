import { useEffect, useRef, useState } from "react";
import notificationSoundUrl from "../../assets/sounds/notification.wav";
import startSoundUrl from "../../assets/sounds/start.wav";
import stopSoundUrl from "../../assets/sounds/stop.wav";
import { useHookyState } from "../../hooks/useHookyState";
import { useSettings } from "../../hooks/useSettings";
import { pickNotificationMessage } from "../../lib/notificationMessages";
import { bubbleBottomOffset } from "../../lib/layout";

const TYPE_INTERVAL_MS = 22;
const HOLD_DURATION_MS = 4500;

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
  const [fullText, setFullText] = useState<string | null>(null);
  const [displayedText, setDisplayedText] = useState("");
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Hover/drag depuis la bulle : le curseur reste dessus tout du long d'un drag (la
  // fenêtre entière suit la souris), donc mouseenter/mouseleave couvre aussi le drag sans
  // détection dédiée.
  const hoveredRef = useRef(false);
  // React.StrictMode (main.tsx) double-invoque volontairement CHAQUE effet en dev (mount ->
  // cleanup -> remount, cf. doc React) -- sans cleanup ici (setFullText/play() ne s'annulent
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
    setFullText(message);
    setDisplayedText("");
    const soundUrl = lastEvent === "Stop" ? stopSoundUrl : notificationSoundUrl;
    void new Audio(soundUrl).play().catch(() => {});

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (typeTimerRef.current) clearInterval(typeTimerRef.current);

    // Effet "streaming" façon chatbot : révèle le message caractère par caractère plutôt
    // que d'un bloc -- le hide timer ne démarre qu'une fois le texte entièrement tapé, pour
    // que la bulle reste lisible HOLD_DURATION_MS après la fin de la frappe (pas depuis
    // son apparition, sinon un message long serait coupé avant d'être fini de lire).
    let shown = 0;
    typeTimerRef.current = setInterval(() => {
      shown += 1;
      setDisplayedText(message.slice(0, shown));
      if (shown >= message.length) {
        if (typeTimerRef.current) clearInterval(typeTimerRef.current);
        typeTimerRef.current = null;
        // Survolée pendant la frappe : le hide timer démarrera plutôt au mouseleave.
        if (!hoveredRef.current) {
          hideTimerRef.current = setTimeout(
            () => setFullText(null),
            HOLD_DURATION_MS,
          );
        }
      }
    }, TYPE_INTERVAL_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  useEffect(
    () => () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (typeTimerRef.current) clearInterval(typeTimerRef.current);
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
        data-drag-handle
        onMouseEnter={() => {
          hoveredRef.current = true;
          if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
          }
        }}
        onMouseLeave={() => {
          hoveredRef.current = false;
          const typingDone =
            fullText !== null && displayedText.length >= fullText.length;
          if (typingDone) {
            hideTimerRef.current = setTimeout(
              () => setFullText(null),
              HOLD_DURATION_MS,
            );
          }
        }}
        className={`relative max-w-full origin-bottom cursor-grab rounded-2xl border bg-popover px-4 py-3 text-center font-mono text-sm font-medium text-popover-foreground shadow-lg transition-all active:cursor-grabbing ${
          fullText
            ? "pointer-events-auto scale-100 translate-y-0 opacity-100 duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            : "pointer-events-none scale-95 translate-y-1 opacity-0 duration-150 ease-in"
        }`}
      >
        {displayedText}
        {fullText && displayedText.length < fullText.length && (
          <span className="animate-pulse">▍</span>
        )}
        {/* Pointe façon bulle de BD, en bas -- pointe vers l'avatar juste en dessous (cf.
            layout de PetAvatar). Même fond/bordure que la bulle (pas de couleur à part) pour
            se fondre dedans -- `-z-10` la fait passer SOUS le fond de la bulle (qui a son
            propre contexte d'empilement via scale/translate) : seule la pointe qui dépasse
            reste visible, le reste est masqué par le fond opaque de la bulle. */}
        <span
          aria-hidden
          className="absolute -bottom-[5px] left-1/2 -z-10 h-2.5 w-2.5 -translate-x-1/2 rotate-45 rounded-[2px] border-r border-b bg-popover"
        />
      </div>
    </div>
  );
}
