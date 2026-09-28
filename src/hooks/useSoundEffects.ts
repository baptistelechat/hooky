import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";
import {
  cueForHook,
  ESSENTIAL_CUES,
  loopStateFor,
  playCue,
  publishLoopActivity,
  setWorkLoopVolume,
  SOUND_PREVIEW_EVENT,
  startWorkLoop,
  stopWorkLoop,
  type SoundCue,
} from "../lib/sounds";

// Au plus un son "fréquent" (outils) toutes les 3 s -- au-delà, une rafale de PreToolUse
// deviendrait vite agaçante.
const FREQUENT_THROTTLE_MS = 3000;

interface SoundEffectsParams {
  animation: string;
  lastEvent?: string;
  notificationType?: string;
  revision: number;
  enabled: boolean;
  /** Mode "moins bavard" : seuls les cues essentiels restent audibles (cf. ESSENTIAL_CUES). */
  quiet: boolean;
  /** Boucle discrète en fond tant que Claude travaille. */
  loopEnabled: boolean;
  feel: string;
  /** Curseurs de mixage (0-100) : cues / boucle de fond. */
  volume: number;
  ambienceVolume: number;
}

/** Joue le son du pet à chaque émission `hooky-state`, dans la fenêtre "main" (toujours
 * vivante, contrairement à la bulle éphémère). Un seul son par émission ; les transitions
 * d'état priment sur le cue de l'événement : entrer en `sleeping` -> "sleep", en sortir
 * -> "wake" (sauf sur `SessionStart`, qui a son propre "start"). Aucun son au lancement
 * (aucune émission). La boucle de fond suit l'état "Claude travaille", indépendamment des cues. */
export function useSoundEffects({
  animation,
  lastEvent,
  notificationType,
  revision,
  enabled,
  quiet,
  loopEnabled,
  feel,
  volume,
  ambienceVolume,
}: SoundEffectsParams): void {
  const latestRef = useRef({
    enabled,
    quiet,
    loopEnabled,
    feel,
    volume,
    ambienceVolume,
  });
  useEffect(() => {
    latestRef.current = {
      enabled,
      quiet,
      loopEnabled,
      feel,
      volume,
      ambienceVolume,
    };
  }, [enabled, quiet, loopEnabled, feel, volume, ambienceVolume]);

  // Curseur d'ambiance déplacé pendant que la boucle joue : appliqué en direct.
  useEffect(() => {
    setWorkLoopVolume(ambienceVolume);
  }, [ambienceVolume]);

  const prevAnimationRef = useRef("sleeping");
  const handledRevisionRef = useRef(0);
  const lastFrequentAtRef = useRef(0);

  // Onglet Animation ouvert (cf. AnimationValidation) : on y teste chaque carte, donc mode
  // discret et throttle sont levés -- sinon 3 clics rapprochés sur seek / progress-step /
  // queued n'en feraient entendre qu'un, voire aucun.
  const previewRef = useRef(false);
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    listen<boolean>(SOUND_PREVIEW_EVENT, (event) => {
      previewRef.current = event.payload;
    })
      .then((fn) => {
        if (cancelled) fn();
        else unlisten = fn;
      })
      .catch(console.error);

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  // Dernier état "Claude travaille ?" connu (true/false ; les pauses entre deux outils ne le
  // changent pas), suivi même boucle coupée : sinon rallumer le réglage en plein travail
  // n'aurait aucun effet avant la prochaine émission, potentiellement longue.
  const workingRef = useRef(false);

  // Réglage coupé : la boucle s'arrête tout de suite. Réglage rallumé pendant que Claude
  // travaille : elle repart tout de suite, sans attendre le prochain événement. Changement de
  // feel en cours de route : startWorkLoop bascule sur la boucle du nouveau feel (fondu croisé).
  useEffect(() => {
    const shouldPlay = enabled && loopEnabled && workingRef.current;
    publishLoopActivity(shouldPlay);
    if (shouldPlay) {
      startWorkLoop(latestRef.current.feel, latestRef.current.ambienceVolume);
    } else {
      stopWorkLoop();
    }
  }, [enabled, loopEnabled, feel]);
  useEffect(
    () => () => {
      stopWorkLoop();
      publishLoopActivity(false);
    },
    [],
  );

  useEffect(() => {
    // revision 0 = état initial, pas une émission -- et garde StrictMode (cf. useHookyState).
    if (revision === 0 || handledRevisionRef.current === revision) return;
    handledRevisionRef.current = revision;

    const previous = prevAnimationRef.current;
    prevAnimationRef.current = animation;

    const working = loopStateFor(animation, lastEvent);
    if (working !== null) workingRef.current = working;

    const { enabled, quiet, loopEnabled, feel, volume, ambienceVolume } =
      latestRef.current;
    publishLoopActivity(enabled && loopEnabled && workingRef.current);
    if (!enabled) return;

    if (loopEnabled) {
      if (working === true) startWorkLoop(feel, ambienceVolume);
      else if (working === false) stopWorkLoop();
    }

    let cue: SoundCue | null;
    let frequent = false;
    if (animation === "sleeping" && previous !== "sleeping") {
      cue = "sleep";
    } else if (
      previous === "sleeping" &&
      animation !== "sleeping" &&
      lastEvent !== "SessionStart"
    ) {
      cue = "wake";
    } else {
      const match = cueForHook(lastEvent, notificationType, animation);
      cue = match?.cue ?? null;
      frequent = match?.frequent ?? false;
    }
    if (!cue) return;

    const preview = previewRef.current;
    if (!preview) {
      if (quiet && !ESSENTIAL_CUES.has(cue)) return;
      if (frequent) {
        const now = Date.now();
        if (now - lastFrequentAtRef.current < FREQUENT_THROTTLE_MS) return;
        lastFrequentAtRef.current = now;
      }
    }

    playCue(feel, cue, volume);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);
}
