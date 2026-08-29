import { useEffect, useRef, useState, type CSSProperties } from "react";
import notificationSoundUrl from "../../assets/sounds/notification.wav";
import startSoundUrl from "../../assets/sounds/start.wav";
import stopSoundUrl from "../../assets/sounds/stop.wav";
import { useHookyState } from "../../hooks/useHookyState";
import { useSettings } from "../../hooks/useSettings";
import { pickNotificationMessage } from "../../lib/notificationMessages";
import { debugZoneClass } from "../../lib/debugZone";
import { BUBBLE_MAX_WIDTH } from "../../lib/layout";

const TYPE_INTERVAL_MS = 22;
const HOLD_DURATION_MS = 4500;

interface NotificationBubbleProps {
  /** `true` quand l'avatar est trop proche du haut de l'écran pour laisser la place
   * habituelle au-dessus (cf. useAvatarScreenLayout) -- bascule la bulle sous l'avatar,
   * comme un Popover qui ouvre vers le bas faute de place en haut. Le placement lui-même
   * (au-dessus/en-dessous de l'avatar) est géré en flux normal par le parent (cf.
   * Avatar.tsx, `order` sur les items `bubble-zone`/`slot`) -- ce composant ne rend QUE la
   * bulle elle-même, `flipped` ne sert ici qu'à orienter son animation/sa pointe. */
  flipped: boolean;
  /** Décalage horizontal (px, 0 = centré) quand la fenêtre déborde à gauche/droite du
   * moniteur (cf. useAvatarScreenLayout) -- la bulle se translate pour rester lisible, la
   * pointe compense en sens inverse pour rester sur l'avatar. */
  shiftX: number;
}

/**
 * Bulle de notification -- affichée par `Avatar.tsx` dans un item de flux normal
 * (`bubble-zone`, jamais en position absolue par rapport à l'avatar : cf. Avatar.tsx pour
 * pourquoi -- le chevauchement bulle/avatar constaté avec plusieurs approches de
 * positionnement calculé est ainsi rendu structurellement impossible). Purement
 * synchrone : `revision` (useHookyState) déclenche directement le show/hide en state
 * React, sans jamais passer par une position de fenêtre à recalculer -- élimine du même
 * coup la race qui laissait parfois une bulle vide affichée indéfiniment (l'ancien effet
 * async pouvait terminer -- et appeler `show()`/rejouer le son -- après avoir déjà été
 * "annulé" par un event suivant, faute d'un check juste avant l'appel final).
 */
export function NotificationBubble({
  flipped,
  shiftX,
}: NotificationBubbleProps) {
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

  return (
    <div
      data-drag-handle
      data-zone="bubble"
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
      // `--tw-translate-x` (pas `left`, la bulle est centrée par le flex parent) --
      // composant natif avec les classes `translate-y-*` ci-dessous, cf. mécanisme
      // `translate: var(--tw-translate-x) var(--tw-translate-y)` de Tailwind 4.
      // `maxWidth` fixe (pas `max-w-full`) : la bulle doit garder une largeur INDÉPENDANTE
      // de `WINDOW_WIDTH` pour que celui-ci puisse rester assez grand pour donner à
      // `shiftX` la place de la décaler sans jamais la rogner (cf. layout.ts).
      style={
        {
          "--tw-translate-x": `${shiftX}px`,
          maxWidth: BUBBLE_MAX_WIDTH,
        } as CSSProperties
      }
      className={`relative cursor-grab rounded-2xl border bg-popover px-4 py-3 text-center font-mono text-sm font-medium text-popover-foreground shadow-lg transition-all active:cursor-grabbing ${
        flipped ? "origin-top" : "origin-bottom"
      } ${
        fullText
          ? "pointer-events-auto translate-y-0 scale-100 opacity-100 duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          : `pointer-events-none scale-95 opacity-0 duration-150 ease-in ${
              flipped ? "-translate-y-1" : "translate-y-1"
            }`
      } ${debugZoneClass(settings.debugMode, "bubble")}`}
    >
      {displayedText}
      {fullText && displayedText.length < fullText.length && (
        <span className="animate-pulse">▍</span>
      )}
      {/* Pointe façon bulle de BD, vers l'avatar (en bas normalement, en haut si
          `flipped` -- avatar remonté en haut de fenêtre, cf. layout de PetAvatar). Même
          fond/bordure que la bulle (pas de couleur à part) pour se fondre dedans -- `-z-10`
          la fait passer SOUS le fond de la bulle (qui a son propre contexte d'empilement
          via scale/translate) : seule la pointe qui dépasse reste visible, le reste est
          masqué par le fond opaque de la bulle. */}
      {/* `left` compense le `shiftX` du parent (`--tw-translate-x` ci-dessus) pour rester
          au même endroit en absolu -- la pointe doit toujours pointer vers l'avatar, même
          quand le corps de la bulle est décalé pour rester visible à l'écran. */}
      <span
        aria-hidden
        style={{ left: `calc(50% - ${shiftX}px)` }}
        className={`absolute -z-10 h-2.5 w-2.5 -translate-x-1/2 rotate-45 rounded-[2px] bg-popover ${
          flipped
            ? "-top-[5px] border-t border-l"
            : "-bottom-[5px] border-r border-b"
        }`}
      />
    </div>
  );
}
