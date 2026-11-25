import {
  mountAvatar,
  setPointer,
  type MountedAvatar,
} from "open-bot-avatar/dom";
import { useEffect, useRef } from "react";
import { cursorInViewport } from "../hooks/useCursorGaze";
import { useSettings } from "../hooks/useSettings";
import { BOT_MATERIALS, botStateFor } from "../lib/botAvatars";
import type { AnimationName, BotAvatarBundle } from "./avatarDefinition";

// Le moteur lisse lui-même le regard (constante ~0,12 s) : 80 ms de polling suffisent.
const CURSOR_POLL_MS = 80;

interface BotAvatarProps {
  bundle: BotAvatarBundle;
  animation: AnimationName;
  size: number;
  /** Suivi du curseur global (pet flottant seulement, pas les cartes du picker). */
  followCursor?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/** Avatar Open Bot Avatar : monté une fois par `mountAvatar`, puis piloté par `update()` --
 * changer d'état, de couleur, d'humeur ou de matière ne remonte rien. */
export function BotAvatar({
  bundle,
  animation,
  size,
  followCursor = false,
  className,
  style,
}: BotAvatarProps) {
  const [settings] = useSettings();
  const hostRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<MountedAvatar | null>(null);
  // Un dormeur ne suit pas le curseur.
  const following = followCursor && animation !== "sleeping";
  const options = {
    definition: bundle.definition,
    color: bundle.color,
    eyeColor: bundle.eyeColor,
    state: botStateFor(animation),
    mood: settings.botMood,
    material: BOT_MATERIALS[settings.botMaterial],
    followPointer: following,
    label: bundle.name,
  };
  const optionsRef = useRef(options);
  // Déclaré avant l'effet de montage : il lit donc déjà les options du render courant.
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    if (!hostRef.current) return;
    avatarRef.current = mountAvatar(hostRef.current, optionsRef.current);
    return () => {
      avatarRef.current?.destroy();
      avatarRef.current = null;
    };
  }, []);

  useEffect(() => {
    avatarRef.current?.update(options);
  });

  // Le curseur sort presque toujours de la fenêtre du pet : on injecte sa position globale dans
  // le pointeur partagé du moteur (px de viewport, hors bornes acceptés).
  useEffect(() => {
    if (!following) return;
    let busy = false;
    const timer = setInterval(() => {
      if (busy) return;
      busy = true;
      cursorInViewport()
        .then(setPointer)
        .catch((error: unknown) =>
          console.error("[BotAvatar] lecture du curseur échouée", error),
        )
        .finally(() => {
          busy = false;
        });
    }, CURSOR_POLL_MS);
    return () => {
      clearInterval(timer);
      setPointer(null);
    };
  }, [following]);

  return (
    <div
      ref={hostRef}
      className={className}
      // `pointer-events: none` : le drag du pet est piloté par son conteneur (cf. Avatar.tsx).
      style={{ ...style, width: size, height: size, pointerEvents: "none" }}
    />
  );
}
