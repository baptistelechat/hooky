import { useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { AvatarEngine, avatarFitScale, definition } from "./avatarDefinition";
import { useSettings } from "../hooks/useSettings";
import { useAnimationEffects } from "../hooks/useAnimationEffects";
import { findMappingEntry } from "../lib/animationCatalog";
import { AnimationOverlay } from "./AnimationOverlay";

export type AnimationName = keyof typeof definition.animations;

interface PetAvatarProps {
  animation: AnimationName;
  lastEvent?: string;
  toolName?: string;
  notificationType?: string;
  revision: number;
}

// Fenêtre entre deux mousedown pour compter un double-clic "à la main". Le natif
// `dblclick` n'est pas fiable ici : `startDragging()` entre dans une boucle de drag OS
// bloquante sur CHAQUE mousedown, ce qui casse le comptage natif du navigateur (voir
// GLRN-212 en mémoire globale -- pattern déjà rencontré ailleurs).
const DOUBLE_CLICK_WINDOW_MS = 300;

/** Ouvre, refocus ou minimise la fenêtre de settings. Si elle a déjà le focus, le
 * double-clic la minimise (toggle, comme cliquer une icône de taskbar déjà active) --
 * sinon `show()`/`unminimize()` avant `setFocus()` la ramène au premier plan : Windows
 * refuse silencieusement de voler le focus à une autre appli avec `setFocus()` seul
 * (anti-focus-stealing), y compris pour ramener une fenêtre déjà ouverte mais passée en
 * arrière-plan ou minimisée. */
async function openSettingsWindow(): Promise<void> {
  const existing = await WebviewWindow.getByLabel("settings");
  if (existing) {
    if (await existing.isFocused()) {
      await existing.minimize();
      return;
    }
    await existing.show();
    await existing.unminimize();
    await existing.setFocus();
    return;
  }

  new WebviewWindow("settings", {
    title: "Hooky - Paramètres",
    width: 620,
    height: 640,
    // max/min Width doivent être fournis en paire avec Height pour être pris en compte
    // (quirk de l'API Tauri, cf. LRN-012) -- généreux sur l'axe non contraint.
    maxWidth: 620,
    maxHeight: 1000,
    minWidth: 400,
    minHeight: 550,
    resizable: true,
    decorations: true,
    center: true,
  });
}

/**
 * Avatar centré dans la fenêtre. La fenêtre n'a pas de barre de titre
 * (decorations: false côté backend) -- on déclenche le déplacement natif via
 * l'API JS explicite plutôt que l'attribut `data-tauri-drag-region`, qui ne
 * traversait pas fiablement le SVG monté par le moteur d'avatar.
 *
 * Double-clic (uniquement) ouvre la fenêtre de paramètres (taille, mode debug...).
 * En mode debug : fond semi-opaque + overlay texte (animation courante + hook déclencheur).
 */
export function PetAvatar({
  animation,
  lastEvent,
  toolName,
  notificationType,
  revision,
}: PetAvatarProps) {
  const [settings] = useSettings();
  const lastClickAtRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useAnimationEffects(
    containerRef,
    animation,
    revision,
    settings.effectsEnabled,
  );

  const mappingEntry = findMappingEntry(lastEvent, animation, notificationType);

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <div
        ref={containerRef}
        className="relative flex cursor-grab items-center justify-center overflow-hidden transition-[width,height,background-color] duration-300 ease-out active:cursor-grabbing"
        style={{
          width: settings.avatarSize,
          height: settings.avatarSize,
          background: settings.debugMode ? "rgba(0, 0, 0, 0.5)" : "transparent",
        }}
        onMouseDown={() => {
          const now = performance.now();
          const isDoubleClick =
            now - lastClickAtRef.current < DOUBLE_CLICK_WINDOW_MS;
          lastClickAtRef.current = isDoubleClick ? 0 : now;

          if (isDoubleClick) {
            void openSettingsWindow();
            return;
          }

          void getCurrentWindow().startDragging();
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <AvatarEngine
          animation={animation}
          size={settings.avatarSize}
          style={{
            transition: "width 300ms ease-out, height 300ms ease-out",
            transform:
              avatarFitScale < 1 ? `scale(${avatarFitScale})` : undefined,
            transformOrigin: "center",
          }}
        />
        <pre
          className={`pointer-events-none absolute top-1 left-1 m-0 font-mono text-xs leading-[1.3] whitespace-pre-wrap text-white opacity-0 [text-shadow:0_0_2px_#000] transition-opacity duration-300 ${settings.debugMode ? "opacity-100" : ""}`}
        >
          {`animation: ${animation}\nhook: ${lastEvent ?? "-"}${
            (toolName ?? notificationType)
              ? ` (${toolName ?? notificationType})`
              : ""
          }`}
        </pre>
      </div>

      <AnimationOverlay
        animation={animation}
        revision={revision}
        enabled={settings.effectsEnabled}
        avatarSize={settings.avatarSize}
        icon={mappingEntry?.icon}
      />
    </div>
  );
}
