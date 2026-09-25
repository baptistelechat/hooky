// Sons UI : pack "uisfx" (CC0, cf. src/assets/sounds/LICENSE-AUDIO). Un dossier par "feel"
// (caractère sonore du pet), même jeu de cues dans chacun -- seule la voix change quand
// l'utilisateur choisit un autre feel, jamais le mapping événement -> cue ci-dessous.

export type SoundCue =
  | "start"
  | "wake"
  | "sleep"
  | "complete"
  | "mention"
  | "notification"
  | "checkpoint"
  | "unlock"
  | "send"
  | "play"
  | "error"
  | "invalid-drop"
  | "collapse"
  | "seek"
  | "progress-step"
  | "queued";

// `color` : couleur de marque de chaque feel, telle que définie par uisfx (manifest.json).
export const SOUND_FEELS = [
  {
    id: "minimal",
    label: "Minimal",
    color: "#e84d2a",
    description: "Sec, précis, presque invisible.",
  },
  {
    id: "soft",
    label: "Soft",
    color: "#d47b83",
    description: "Feutré, chaleureux et rassurant.",
  },
  {
    id: "glass",
    label: "Glass",
    color: "#4c8ca5",
    description: "Cristallin, brillant, haut de gamme.",
  },
  {
    id: "arcade",
    label: "Arcade",
    color: "#7257d9",
    description: "Pixels costauds et bonne humeur électrique.",
  },
  {
    id: "mechanical",
    label: "Mécanique",
    color: "#68736f",
    description: "Interrupteurs, relais et déclics fermes.",
  },
  {
    id: "organic",
    label: "Organique",
    color: "#718b4e",
    description: "Bois, eau, souffle et petits cailloux.",
  },
  {
    id: "dreamy",
    label: "Dreamy",
    color: "#a36cad",
    description: "Éclosions aériennes, lumière douce, scintillement lent.",
  },
  {
    id: "scifi",
    label: "Sci-fi",
    color: "#20a29d",
    description:
      "Pings holographiques propres, scintillement numérique retenu.",
  },
  {
    id: "rubber",
    label: "Rubber",
    color: "#d99a24",
    description: "Tapotements élastiques, rebond vif et sympathique.",
  },
  {
    id: "cinematic",
    label: "Cinématique",
    color: "#3f5873",
    description: "Impacts profonds, queues soignées, ampleur discrète.",
  },
  {
    id: "studio",
    label: "Studio",
    color: "#6261a8",
    description: "Précision tactile d'un montage, sobriété chaude.",
  },
  {
    id: "zen",
    label: "Zen",
    color: "#7d8f77",
    description: "Notes pures, bois sec, brève touche de washi.",
  },
] as const;

export const DEFAULT_SOUND_FEEL = "minimal";

// Event Tauri émis par l'onglet Animation (fenêtre settings) tant qu'il est ouvert -- la
// fenêtre "main", qui joue les sons du flux réel, lève alors le mode discret et le throttle
// pour que chaque carte sonne à chaque clic.
export const SOUND_PREVIEW_EVENT = "hooky-sound-preview";

// Mode "moins bavard" : seuls ces cues restent audibles (présence du pet, besoin de toi, fin
// de tâche, erreur grave). Tout le reste est de l'ambiance informative.
export const ESSENTIAL_CUES: ReadonlySet<SoundCue> = new Set<SoundCue>([
  "start",
  "wake",
  "sleep",
  "complete",
  "mention",
  "notification",
  "error",
]);

const CUE_URLS = import.meta.glob<string>("../assets/sounds/*/*.mp3", {
  eager: true,
  query: "?url",
  import: "default",
});

/** Curseur de volume (0-100) -> gain. Courbe quadratique : l'oreille est logarithmique, un
 * curseur linéaire serait presque inutilisable dans le bas (50 % -> -12 dB, 25 % -> -24 dB). */
export function toGain(percent: number): number {
  const ratio = Math.min(Math.max(percent, 0), 100) / 100;
  return ratio * ratio;
}

/** `volume` : curseur « Volume des sons » (0-100). */
export function playCue(feel: string, cue: SoundCue, volume = 100): void {
  const url = CUE_URLS[`../assets/sounds/${feel}/${cue}.mp3`];
  if (!url) {
    console.error(`[sounds] cue introuvable : ${feel}/${cue}`);
    return;
  }
  const audio = new Audio(url);
  audio.volume = toGain(volume);
  audio.play().catch(console.error);
}

// --- Boucle de fond pendant que Claude travaille -------------------------------------------
// OGG + AudioBufferSourceNode (pas <audio loop>, ni MP3) : seule voie sans trou audible à la
// jointure. Les fichiers sont au même niveau que les cues ; la discrétion vient du curseur
// « Volume de l'ambiance » (bas par défaut), comme le bus ambiance d'un jeu.

// Une seule boucle par feel est livrée (parmi les 6 d'uisfx : loading, processing, recording,
// connecting, scanning, streaming) -- en changer = ce nom + regénérer les fichiers.
const WORK_LOOP = "streaming";
const LOOP_URLS = import.meta.glob<string>("../assets/sounds/*/*.ogg", {
  eager: true,
  query: "?url",
  import: "default",
});
const LOOP_FADE_S = 0.6;

let loopContext: AudioContext | null = null;
let activeLoop: {
  feel: string;
  source: AudioBufferSourceNode;
  gain: GainNode;
} | null = null;
let loopWanted = false;
let loopStarting = false;
let loopGain = 1;
const loopBuffers = new Map<string, AudioBuffer>();

// La fenêtre "settings" a son propre AudioContext et ne voit pas la boucle de la fenêtre "main" :
// sans ce drapeau partagé (localStorage, même origine), son aperçu de curseur jouait une 2e
// boucle par-dessus la vraie quand Claude travaillait -- d'où un vacarme en double.
const LOOP_ACTIVE_KEY = "hooky-loop-active";

/** Publié par la fenêtre "main" : la boucle de fond doit-elle jouer en ce moment ? */
export function publishLoopActivity(active: boolean): void {
  try {
    localStorage.setItem(LOOP_ACTIVE_KEY, String(active));
  } catch {
    // ponytail: stockage indisponible -> pas de drapeau, l'aperçu jouera (pire cas : un doublon bref).
  }
}

export function isMainLoopActive(): boolean {
  try {
    return localStorage.getItem(LOOP_ACTIVE_KEY) === "true";
  } catch {
    return false;
  }
}

/** Change le volume de la boucle (curseur 0-100), même si elle joue déjà. */
export function setWorkLoopVolume(percent: number): void {
  loopGain = toGain(percent);
  if (!activeLoop || !loopContext) return;
  const { gain } = activeLoop;
  const now = loopContext.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setTargetAtTime(loopGain, now, 0.05);
}

/** `volume` : curseur « Volume de l'ambiance » (0-100). */
export function startWorkLoop(feel: string, volume: number): void {
  // Autre feel choisi pendant que la boucle joue : l'ancienne s'éteint en fondu et la nouvelle
  // démarre juste après (enchaîné, donc un fondu croisé).
  if (activeLoop && activeLoop.feel !== feel) stopWorkLoop();
  loopWanted = true;
  loopGain = toGain(volume);
  if (activeLoop || loopStarting) return;
  const url = LOOP_URLS[`../assets/sounds/${feel}/${WORK_LOOP}.ogg`];
  if (!url) return;

  loopStarting = true;
  void (async () => {
    try {
      const context = (loopContext ??= new AudioContext());
      // Sans `await` : hors geste utilisateur, resume() peut rester en attente indéfiniment, ce
      // qui laisserait `loopStarting` bloqué et empêcherait toute reprise. Démarrer la source sur
      // un contexte suspendu suffit : elle sonne dès qu'il reprend.
      void context.resume().catch(console.error);
      let buffer = loopBuffers.get(url);
      if (!buffer) {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} sur ${url}`);
        }
        buffer = await context.decodeAudioData(await response.arrayBuffer());
        loopBuffers.set(url, buffer);
      }
      // Un stop() a pu arriver pendant le décodage (première lecture) : ne pas démarrer.
      if (!loopWanted) return;

      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(
        loopGain,
        context.currentTime + LOOP_FADE_S,
      );
      source.connect(gain).connect(context.destination);
      source.start();
      activeLoop = { feel, source, gain };
    } catch (error) {
      console.error("[sounds] boucle de fond échouée", error);
    } finally {
      loopStarting = false;
    }
  })();
}

export function stopWorkLoop(): void {
  loopWanted = false;
  if (!activeLoop || !loopContext) return;
  const { source, gain } = activeLoop;
  activeLoop = null;
  const now = loopContext.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(0, now + LOOP_FADE_S);
  source.stop(now + LOOP_FADE_S);
}

// États d'animation qui démarrent / coupent la boucle. `idle` (pause entre deux outils) et
// `confused` (échec d'un outil) ne changent rien : sinon la boucle clignoterait à chaque outil.
const WORK_ANIMATIONS: ReadonlySet<string> = new Set([
  "thinking",
  "working",
  "searching",
]);
const REST_ANIMATIONS: ReadonlySet<string> = new Set([
  "celebrate",
  "listening",
  "bored",
  "sleeping",
]);

/** `true` : Claude travaille (démarrer/garder la boucle), `false` : c'est fini ou il attend
 * l'utilisateur (couper), `null` : pause entre deux actions, ne rien changer. */
export function loopStateFor(
  animation: string,
  lastEvent: string | undefined,
): boolean | null {
  if (WORK_ANIMATIONS.has(animation)) return true;
  if (REST_ANIMATIONS.has(animation) || lastEvent === "StopFailure")
    return false;
  return null;
}

// Correspondance émotion -> cue : plusieurs événements partagent volontairement le même
// son quand ils disent la même chose au pet (cohérence > diversité) ; la nuance passe par
// le texte de la bulle.
const EVENT_CUES: Record<string, SoundCue> = {
  SessionStart: "start",
  UserPromptSubmit: "send",
  Stop: "complete",
  StopFailure: "error",
  PostToolUseFailure: "invalid-drop",
  PreCompact: "collapse",
  PostCompact: "checkpoint",
};

const NOTIFICATION_CUES: Record<string, SoundCue> = {
  permission_prompt: "mention",
  agent_needs_input: "mention",
  elicitation_dialog: "mention",
  elicitation_url_dialog: "mention",
  quota_auto_resume_disabled: "mention",
  agent_completed: "checkpoint",
  elicitation_complete: "checkpoint",
  auth_success: "unlock",
  elicitation_response: "send",
  quota_auto_resume_fired: "play",
  quota_auto_resume_stale: "play",
};

export interface CueMatch {
  cue: SoundCue;
  /** Événement très fréquent (outils) : limité à un son toutes les 3 s, cf. useSoundEffects. */
  frequent: boolean;
}

/** Cue d'un hook, hors transition sleeping/éveillé (gérée à part, cf. useSoundEffects).
 * `idle_prompt` est volontairement absent : il produit l'état `sleeping`, donc le son
 * "sleep" vient de la transition -- un cue d'événement en plus ferait doublon. `animation`
 * ne sert qu'à PreToolUse (recherche vs outil standard, même découpage que le backend). */
export function cueForHook(
  lastEvent: string | undefined,
  notificationType: string | undefined,
  animation: string,
): CueMatch | null {
  if (!lastEvent) return null;

  if (lastEvent === "Notification") {
    if (notificationType === "idle_prompt") return null;
    return {
      cue: NOTIFICATION_CUES[notificationType ?? ""] ?? "notification",
      frequent: false,
    };
  }
  if (lastEvent === "PreToolUse") {
    return {
      cue: animation === "searching" ? "seek" : "progress-step",
      frequent: true,
    };
  }
  if (lastEvent === "SubagentStart") return { cue: "queued", frequent: true };

  const cue = EVENT_CUES[lastEvent];
  return cue ? { cue, frequent: false } : null;
}

// Événements volontairement sans cue, avec la raison (affichée sur leur carte de l'onglet
// Animation). Les hooks `PermissionRequest`/`Elicitation` ET les `Notification` correspondantes
// sont tous installés : les deux arrivent quasi simultanément pour la même demande, donc un
// seul des deux sonne (la Notification, aussi seule à avoir une bulle).
const SILENT_REASONS: Record<string, string> = {
  PostToolUse: "trop fréquent (après chaque outil)",
  SubagentStop: "doublon de agent_completed",
  PermissionRequest: "doublon de permission_prompt",
  Elicitation: "doublon de elicitation_dialog",
};

export function silentReasonFor(hookEventName: string): string | undefined {
  return SILENT_REASONS[hookEventName];
}

/** Cue affiché/joué sur une carte de l'onglet Animation : idem `cueForHook`, sauf qu'un état
 * `sleeping` vaut toujours "sleep" (la transition n'existe pas hors flux réel). */
export function cueForCatalogEntry(
  hookEventName: string,
  notificationType: string | undefined,
  animation: string,
): SoundCue | null {
  if (animation === "sleeping") return "sleep";
  return cueForHook(hookEventName, notificationType, animation)?.cue ?? null;
}
