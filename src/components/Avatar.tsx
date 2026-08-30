import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect, useRef } from "react";
import { useAnimationEffects } from "../hooks/useAnimationEffects";
import { useAvatarBundle } from "../hooks/useAvatarBundle";
import { useBubbleWindow } from "../hooks/useBubbleWindow";
import { useSettings } from "../hooks/useSettings";
import { findMappingEntry } from "../lib/animationCatalog";
import { debugZoneClass } from "../lib/debugZone";
import { startClampedDrag } from "../lib/windowDrag";
import { AnimationOverlay } from "./AnimationOverlay";
import { avatarBundleKey, type AnimationName } from "./avatarDefinition";
import { FittedAvatarEngine } from "./FittedAvatarEngine";

export type { AnimationName };

interface PetAvatarProps {
  animation: AnimationName;
  lastEvent?: string;
  toolName?: string;
  notificationType?: string;
  revision: number;
}

// Fenêtre entre deux mousedown pour compter un double-clic "à la main" -- le natif
// `dblclick` ne se déclencherait plus normalement puisque chaque mousedown démarre un drag
// manuel (cf. startClampedDrag) qui capture mousemove/mouseup globalement (voir GLRN-212 en
// mémoire globale -- pattern déjà rencontré ailleurs avec l'ancien `startDragging()`).
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
    height: 570,
    // max/min Width doivent être fournis en paire avec Height pour être pris en compte
    // (quirk de l'API Tauri, cf. LRN-012) -- généreux sur l'axe non contraint.
    maxWidth: 620,
    maxHeight: 1000,
    minWidth: 400,
    minHeight: 570,
    resizable: true,
    decorations: true,
    center: true,
  });
}

/**
 * Avatar + badge, seuls occupants de la fenêtre "main" -- la bulle de notification vit
 * désormais dans sa propre fenêtre Tauri, spawnée à la demande (cf. useBubbleWindow,
 * NotificationBubbleWindow), plus fusionnée ici (cf. mémoire projet, révise cette fusion).
 * La fenêtre "main" est dimensionnée EXACTEMENT à `avatarSize` (aucune marge, l'avatar
 * occupe toute la fenêtre) -- redimensionnée uniquement quand `avatarSize` change
 * (Settings, rare et délibéré), jamais par notification.
 *
 * La fenêtre n'a pas de barre de titre (decorations: false côté backend) -- le déplacement
 * est piloté à la main (`startClampedDrag`, cf. src/lib/windowDrag.ts) plutôt que via
 * `startDragging()`/`data-tauri-drag-region` : la boucle de déplacement interactive de l'OS
 * déclenchée par ces deux mécanismes garde la main sur la position de la fenêtre pendant
 * tout le drag, rendant impossible d'empêcher l'avatar de déborder de l'écran (constaté en
 * test réel, cf. mémoire projet) -- en pilotant nous-mêmes chaque mise à jour de position,
 * un clamp aux limites du moniteur peut réellement s'appliquer en continu.
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

  // Fenêtre "main" dimensionnée EXACTEMENT à `avatarSize` (aucune marge -- l'avatar occupe
  // toute la fenêtre, comme avant la fusion de la bulle, cf. mémoire projet) -- jamais
  // déclenché par une notification (cf. mémoire projet : le resize par notification a été
  // abandonné pour cause de flash), uniquement par le slider Settings. Débouncé : contrairement
  // à `setPosition()` pendant un drag (cf. windowDrag.ts), un vrai resize OS re-layoute toute
  // la surface WebView2 -- l'appeler à chaque tick du slider (qui en émet des dizaines par
  // seconde pendant qu'on le fait glisser) est visible et saccadé. La transition CSS déjà en
  // place sur l'avatar (`transition-[width,height,...]`) donne l'illusion de fluidité pendant
  // le drag du slider ; ce debounce ne fait rattraper la vraie taille de fenêtre qu'une fois
  // la valeur stabilisée.
  useEffect(() => {
    const timeout = setTimeout(() => {
      void getCurrentWindow()
        .setSize(new LogicalSize(settings.avatarSize, settings.avatarSize))
        .catch((error: unknown) =>
          console.error("[PetAvatar] setSize échoué", error),
        );
    }, 120);
    return () => clearTimeout(timeout);
  }, [settings.avatarSize]);

  useBubbleWindow({
    lastEvent,
    notificationType,
    revision,
    avatarSize: settings.avatarSize,
    notificationsEnabled: settings.notificationsEnabled,
    callName: settings.callName,
  });

  const lastClickAtRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const bundle = useAvatarBundle(
    settings.avatarId,
    settings.avatarColorOverrides[settings.avatarId],
  );

  useAnimationEffects(
    containerRef,
    animation,
    revision,
    settings.effectsEnabled,
  );

  const mappingEntry = findMappingEntry(lastEvent, animation, notificationType);

  return (
    <div
      data-zone="window"
      className={`relative flex h-full w-full items-center justify-center overflow-hidden ${debugZoneClass(settings.debugMode, "window")}`}
      onMouseDown={(e) => {
        if (
          !(e.target instanceof Element) ||
          !e.target.closest("[data-drag-handle]")
        ) {
          return;
        }
        // Évite la sélection de texte pendant le drag manuel (mousemove global, cf.
        // startClampedDrag) -- le natif `startDragging()` s'en chargeait implicitement en
        // prenant la main sur la souris, ce qui n'est plus le cas ici.
        e.preventDefault();

        const now = performance.now();
        const isDoubleClick =
          now - lastClickAtRef.current < DOUBLE_CLICK_WINDOW_MS;
        lastClickAtRef.current = isDoubleClick ? 0 : now;

        if (isDoubleClick) {
          void openSettingsWindow();
          return;
        }

        startClampedDrag(e.screenX, e.screenY, settings.avatarSize);
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        data-zone="slot"
        className={`relative flex items-center justify-center ${debugZoneClass(settings.debugMode, "slot")}`}
        style={{
          width: settings.avatarSize,
          height: settings.avatarSize,
        }}
      >
        <div
          ref={containerRef}
          data-drag-handle
          data-zone="avatar"
          className={`relative flex cursor-grab items-center justify-center drop-shadow-[0_4px_6px_rgba(0,0,0,0.2)] transition-[width,height,background-color,scale,rotate,filter] duration-300 ease-out hover:-rotate-5 hover:scale-100 active:cursor-grabbing active:drop-shadow-[0_8px_10px_rgba(0,0,0,0.4)] active:scale-105 ${debugZoneClass(settings.debugMode, "avatar")}`}
          style={{
            width: settings.avatarSize,
            height: settings.avatarSize,
          }}
        >
          {/* `key` sur avatarId+couleurs (cf. avatarBundleKey) : chaque bundle a son propre
              composant `AvatarEngine` (cf. avatarDefinition.createAvatar) -- changer d'avatar
              OU de couleur éditée le reconstruit entièrement, pas de morph possible entre
              deux moteurs différents. `animate-in fade-in` (tw-animate-css, déjà utilisé
              ailleurs dans l'app) adoucit ce remount plutôt que de laisser le nouvel avatar
              apparaître d'un coup ; pas de fade-out symétrique de l'ancien -- demanderait de
              garder les deux montés en parallèle le temps de la transition, disproportionné
              pour un changement rare et volontaire (avatar ou couleur). */}
          <FittedAvatarEngine
            key={avatarBundleKey(bundle)}
            bundle={bundle}
            animation={animation}
            size={settings.avatarSize}
            className="animate-in fade-in duration-300"
            style={{
              transition: "width 300ms ease-out, height 300ms ease-out",
            }}
          />
          {/* En bas (pas en haut) : le badge d'état occupe le coin haut-droit (cf.
              AnimationOverlay, BADGE_INSET_PCT) -- un panneau texte en haut s'y superposait. */}
          <pre
            className={`pointer-events-none absolute bottom-1 left-1 z-50 m-0 font-mono text-[10px] leading-[1.3] whitespace-pre-wrap text-white opacity-0 [text-shadow:0_0_2px_#000] transition-opacity duration-300 ${settings.debugMode ? "opacity-100" : ""}`}
          >
            {[
              `animation: ${animation} (rev ${revision})`,
              `hook: ${lastEvent ?? "-"}${
                toolName ? ` tool=${toolName}` : ""
              }${notificationType ? ` type=${notificationType}` : ""}`,
              `avatarSize: ${settings.avatarSize}px`,
            ].join("\n")}
          </pre>
        </div>

        <AnimationOverlay
          animation={animation}
          revision={revision}
          enabled={settings.effectsEnabled}
          avatarSize={settings.avatarSize}
          icon={mappingEntry?.icon}
          badgeIconColor={bundle.badgeIconColor}
          showDebugZone={settings.debugMode}
        />
      </div>
    </div>
  );
}
