import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import notificationSoundUrl from "../assets/sounds/notification.wav";
import startSoundUrl from "../assets/sounds/start.wav";
import stopSoundUrl from "../assets/sounds/stop.wav";
import { useHookyState } from "../hooks/useHookyState";
import { useSettings } from "../hooks/useSettings";
import { debugZoneClass } from "../lib/debugZone";
import {
  BUBBLE_MAX_WIDTH,
  BUBBLE_SHADOW_GAP,
  BUBBLE_TAIL_GAP,
  BUBBLE_WINDOW_WIDTH,
  EDGE_PADDING,
} from "../lib/layout";
import { pickNotificationMessage } from "../lib/notificationMessages";

const TYPE_INTERVAL_MS = 22;
const HOLD_DURATION_MS = 4500;
// Doit correspondre à la durée de la transition CSS de sortie ci-dessous (duration-150) --
// petite marge pour laisser le navigateur peindre la dernière frame avant de fermer la
// fenêtre sous elle.
const HIDE_TRANSITION_MS = 170;

type Phase = "measuring" | "positioned" | "revealing";

function soundForEvent(lastEvent?: string): string {
  if (lastEvent === "Stop") return stopSoundUrl;
  if (lastEvent === "SessionStart") return startSoundUrl;
  return notificationSoundUrl;
}

/**
 * Contenu complet de la fenêtre Tauri "bubble" -- spawnée à la demande par
 * `useBubbleWindow` (fenêtre "main") quand un message doit s'afficher, et qui se ferme
 * elle-même (`getCurrentWindow().close()`) une fois son animation de sortie jouée, que ce
 * soit après le hold timer normal ou suite à un `hooky-bubble-dismiss` (émis par
 * `windowDrag.ts` dès qu'un drag de l'avatar démarre -- on ne tente jamais de faire suivre
 * cette fenêtre en direct, cf. mémoire projet sur le flash structurel CSS/IPC).
 *
 * Le message affiché AU MONTAGE vient de l'URL de la fenêtre (`?bubbleText=...`, posé par
 * `useBubbleWindow` au spawn) -- PAS de l'event `hooky-state` correspondant : cette fenêtre
 * n'existe pas encore au moment où cet event est émis (c'est lui qui déclenche sa création),
 * donc son propre `listen()` ne le recevra jamais (Tauri ne rejoue pas les events passés à
 * un listener tardif). Les notifications SUIVANTES, reçues pendant que cette fenêtre reste
 * ouverte, passent normalement par `useHookyState`.
 *
 * Séquence au montage (fenêtre créée `visible: false`, `x`/largeur déjà définitifs par
 * `useBubbleWindow` -- seuls la hauteur et le Y restent à corriger) :
 * 1. "measuring" -- le message complet est peint tel quel (pas d'effet machine à écrire) le
 *    temps de mesurer la hauteur RÉELLE du rendu (`bubbleRef`).
 * 2. Cette hauteur décide elle-même au-dessus/en-dessous de l'avatar (`flipped`) -- pas
 *    `useBubbleWindow`, qui n'a pas encore cette information à l'instant du spawn.
 * 3. "positioned" -- fenêtre redimensionnée (hauteur) + repositionnée (Y) en conséquence
 *    (toujours invisible), un double `requestAnimationFrame` laisse le temps au nouveau
 *    rendu (orientation `flipped`) d'être peint avant `show()`.
 * 4. "revealing" -- la fenêtre est montrée, le texte repart de zéro avec l'effet machine à
 *    écrire normal.
 */
export function NotificationBubbleWindow() {
  const { lastEvent, notificationType, revision } = useHookyState();
  const [settings] = useSettings();
  const [phase, setPhase] = useState<Phase>("measuring");
  const [flipped, setFlipped] = useState(false);
  const [fullText, setFullText] = useState<string | null>(null);
  const [displayedText, setDisplayedText] = useState("");
  const bubbleRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hoveredRef = useRef(false);
  // Un message a-t-il déjà été affiché au moins une fois -- distingue le tout premier
  // rendu (fullText démarre à `null`, ne doit PAS déclencher une fermeture immédiate) d'une
  // vraie sortie après affichage (cf. effet de fermeture plus bas).
  const hasShownRef = useRef(false);
  const handledRevisionRef = useRef<number | null>(null);
  // `shiftX` : décalage du CORPS de la bulle pour rester visible à l'écran (avatar collé à
  // un bord, cf. useBubbleWindow) -- lu une seule fois depuis l'URL au premier rendu, ne
  // change jamais après (affecte le rendu, donc state -- pas ref, cf. règle
  // react-hooks/refs).
  const [shiftX] = useState(
    () =>
      Number(new URLSearchParams(window.location.search).get("bubbleShiftX")) ||
      0,
  );

  // Factorisé : utilisé à la fois pour la révélation du message initial (phase
  // "revealing", cf. effet 4 ci-dessous) et pour chaque notification suivante reçue via
  // `hooky-state` pendant que la fenêtre reste déjà ouverte.
  const showMessage = (message: string, soundUrl: string) => {
    hasShownRef.current = true;
    setFullText(message);
    setDisplayedText("");
    void new Audio(soundUrl).play().catch(() => {});

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (typeTimerRef.current) clearInterval(typeTimerRef.current);

    let shown = 0;
    typeTimerRef.current = setInterval(() => {
      shown += 1;
      setDisplayedText(message.slice(0, shown));
      if (shown >= message.length) {
        if (typeTimerRef.current) clearInterval(typeTimerRef.current);
        typeTimerRef.current = null;
        if (!hoveredRef.current) {
          hideTimerRef.current = setTimeout(
            () => setFullText(null),
            HOLD_DURATION_MS,
          );
        }
      }
    }, TYPE_INTERVAL_MS);
  };

  // Message initial (cf. docstring) -- une seule fois au montage.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialText = params.get("bubbleText");
    if (!initialText) return;
    hasShownRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFullText(initialText);
    setDisplayedText(initialText);
  }, []);

  // Mesure + décide flipped + redimensionne/repositionne (fenêtre toujours invisible).
  useEffect(() => {
    if (phase !== "measuring" || fullText === null || !bubbleRef.current) {
      return;
    }
    const params = new URLSearchParams(window.location.search);

    void (async () => {
      // Le texte utilise une police web custom (Geist Mono) -- si elle n'est pas encore
      // chargée au moment de la mesure, le fallback système peut faire retomber le texte sur
      // moins de lignes que la police finale, sous-dimensionnant la fenêtre (le vrai rendu,
      // plus haut une fois la police chargée, déborde alors du haut). Attendre son chargement
      // avant de mesurer élimine cette course.
      await document.fonts.ready;
      if (!bubbleRef.current) return;

      // `offsetHeight` (pas `getBoundingClientRect()`) : pendant "measuring", la bulle porte
      // encore sa classe `scale-95` (état caché avant révélation, cf. plus bas) --
      // `getBoundingClientRect()` inclut les transforms CSS et mesurerait donc 95% de la
      // vraie taille, sous-dimensionnant la fenêtre. `offsetHeight` ignore les transforms
      // (taille de layout réelle), déjà rogné du contenu une fois passé à `scale-100`.
      const newHeight =
        bubbleRef.current.offsetHeight + BUBBLE_TAIL_GAP + BUBBLE_SHADOW_GAP;
      const avatarTop = Number(params.get("avatarTop"));
      const avatarBottom = Number(params.get("avatarBottom"));
      const monitorTop = Number(params.get("monitorTop"));
      const bubbleX = Number(params.get("bubbleX"));
      // `EDGE_PADDING` (cf. layout.ts) : la bulle ne doit pas non plus coller pile contre le
      // bord haut de l'écran quand elle passe au-dessus de l'avatar.
      const nextFlipped = avatarTop - monitorTop - EDGE_PADDING < newHeight;
      const y = nextFlipped ? avatarBottom : avatarTop - newHeight;

      const win = getCurrentWindow();
      await win
        .setSize(new LogicalSize(BUBBLE_WINDOW_WIDTH, newHeight))
        .catch((error: unknown) =>
          console.error("[NotificationBubbleWindow] setSize échoué", error),
        );
      await win
        .setPosition(new LogicalPosition(bubbleX, y))
        .catch((error: unknown) =>
          console.error("[NotificationBubbleWindow] setPosition échoué", error),
        );
      setFlipped(nextFlipped);
      setPhase("positioned");
    })();
  }, [phase, fullText]);

  // Laisse peindre le nouveau `flipped` avant d'afficher la fenêtre (double rAF, même
  // technique que AnimationOverlay pour garantir un paint intermédiaire).
  useEffect(() => {
    if (phase !== "positioned") return;
    let cancelled = false;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (cancelled) return;
        void getCurrentWindow()
          .show()
          .catch((error: unknown) =>
            console.error("[NotificationBubbleWindow] show échoué", error),
          );
        setPhase("revealing");
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [phase]);

  // Fenêtre affichée -- relance le message depuis zéro avec l'effet machine à écrire.
  useEffect(() => {
    if (phase !== "revealing" || fullText === null) return;
    const lastEventParam = new URLSearchParams(window.location.search).get(
      "bubbleLastEvent",
    );
    // Réagit au passage en phase "revealing" -- pas un dérivé de state React local, cf.
    // règle react-hooks/set-state-in-effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    showMessage(fullText, soundForEvent(lastEventParam ?? undefined));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Notifications suivantes, reçues normalement pendant que cette fenêtre reste ouverte.
  useEffect(() => {
    if (handledRevisionRef.current === revision) return;
    handledRevisionRef.current = revision;

    if (!settings.notificationsEnabled) return;

    const message = pickNotificationMessage(
      lastEvent,
      notificationType,
      settings.callName,
    );
    if (!message) return;

    // Réagit à un event externe (revision, IPC Tauri via useHookyState) -- pas un dérivé
    // de state React local, cf. règle react-hooks/set-state-in-effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    showMessage(message, soundForEvent(lastEvent));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  // Dismiss forcé -- l'avatar vient de démarrer un drag (cf. windowDrag.ts). Annule les
  // timers en cours et réutilise le même chemin de sortie que le hold timer normal (juste
  // en avance) : une seule sortie CSS à gérer, jamais deux logiques différentes.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    listen("hooky-bubble-dismiss", () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (typeTimerRef.current) clearInterval(typeTimerRef.current);
      typeTimerRef.current = null;
      setFullText(null);
    }).then((fn) => {
      if (cancelled) {
        fn();
      } else {
        unlisten = fn;
      }
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  // La fenêtre se tue elle-même une fois l'animation de sortie jouée -- jamais au tout
  // premier rendu (`hasShownRef`), seulement après une vraie transition affiché -> masqué.
  useEffect(() => {
    if (fullText !== null || !hasShownRef.current) return;
    const timeout = setTimeout(() => {
      void getCurrentWindow()
        .close()
        .catch((error: unknown) =>
          console.error("[NotificationBubbleWindow] close échoué", error),
        );
    }, HIDE_TRANSITION_MS);
    return () => clearTimeout(timeout);
  }, [fullText]);

  useEffect(
    () => () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (typeTimerRef.current) clearInterval(typeTimerRef.current);
    },
    [],
  );

  return (
    // `pt-[5px]`/`pb-[5px]` DOIT correspondre à `BUBBLE_TAIL_GAP` (layout.ts, ajouté à la
    // hauteur de fenêtre calculée plus haut) -- classes Tailwind statiques, impossible d'y
    // injecter la constante directement (cf. mémoire projet sur debugZoneClass). Sans cette
    // marge réservée côté avatar, le corps de la bulle (items-start/items-end) vient flush
    // contre CE bord de la fenêtre et la pointe (qui dépasse de 5px du corps) est rognée par
    // le bord de la fenêtre -- déjà rencontré une fois, cf. mémoire projet.
    <div
      className={`flex h-full w-full ${flipped ? "items-start pt-[5px]" : "items-end pb-[5px]"} justify-center px-2 ${debugZoneClass(settings.debugMode, "bubble-zone", flipped)}`}
    >
      <div
        ref={bubbleRef}
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
        // `shiftX` recentre le CORPS de la bulle sur l'avatar quand la fenêtre (bien plus
        // large, cf. layout.ts) déborde du moniteur -- cf. useBubbleWindow.
        style={
          {
            "--tw-translate-x": `${shiftX}px`,
            maxWidth: BUBBLE_MAX_WIDTH,
          } as CSSProperties
        }
        className={`relative rounded-2xl border bg-popover px-4 py-5 text-center font-mono text-sm font-medium text-popover-foreground shadow-lg transition-all ${
          flipped ? "origin-top" : "origin-bottom"
        } ${
          phase === "revealing" && fullText
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100 duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            : `pointer-events-none scale-95 opacity-0 duration-150 ease-in ${
                flipped ? "-translate-y-1" : "translate-y-1"
              }`
        } ${debugZoneClass(settings.debugMode, "bubble", flipped)}`}
      >
        {displayedText}
        {phase === "revealing" &&
          fullText &&
          displayedText.length < fullText.length && (
            <span className="animate-pulse">▍</span>
          )}
        {/* Pointe façon bulle de BD, vers l'avatar (en bas normalement, en haut si
            `flipped`) -- `left` compense `shiftX` pour rester au même endroit en absolu :
            la pointe doit toujours pointer vers l'avatar, même quand le corps de la bulle
            est décalé pour rester visible à l'écran. */}
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
    </div>
  );
}
