import { useRef } from "react";
import { createAvatar } from "@bible-strong/avatar-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import definition from "./avatar.json";
import { useSettings } from "../hooks/useSettings";

const AvatarEngine = createAvatar(definition);
export type AnimationName = keyof typeof definition.animations;

interface PetAvatarProps {
  animation: AnimationName;
  lastEvent?: string;
  toolName?: string;
}

// Fenêtre entre deux mousedown pour compter un double-clic "à la main". Le natif
// `dblclick` n'est pas fiable ici : `startDragging()` entre dans une boucle de drag OS
// bloquante sur CHAQUE mousedown, ce qui casse le comptage natif du navigateur (voir
// GLRN-212 en mémoire globale -- pattern déjà rencontré ailleurs).
const DOUBLE_CLICK_WINDOW_MS = 300;

/** Ouvre (ou refocus) la fenêtre de settings. */
async function openSettingsWindow(): Promise<void> {
  const existing = await WebviewWindow.getByLabel("settings");
  if (existing) {
    await existing.setFocus();
    return;
  }

  new WebviewWindow("settings", {
    title: "Hooky — Paramètres",
    width: 420,
    height: 560,
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
export function PetAvatar({ animation, lastEvent, toolName }: PetAvatarProps) {
  const [settings] = useSettings();
  const lastClickAtRef = useRef(0);

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden">
      <div
        className="relative flex items-center justify-center overflow-hidden"
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
      >
        <AvatarEngine animation={animation} size={settings.avatarSize} />
        {settings.debugMode && (
          <pre className="pointer-events-none absolute top-1 left-1 m-0 font-mono text-xs leading-[1.3] whitespace-pre-wrap text-white [text-shadow:0_0_2px_#000]">
            {`animation: ${animation}\nhook: ${lastEvent ?? "-"}${toolName ? ` (${toolName})` : ""}`}
          </pre>
        )}
      </div>
    </div>
  );
}
