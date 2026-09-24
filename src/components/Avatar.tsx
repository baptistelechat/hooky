import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef, useState } from "react";
import { useAnimationEffects } from "../hooks/useAnimationEffects";
import { useAvatarBundle } from "../hooks/useAvatarBundle";
import { useBubbleWindow } from "../hooks/useBubbleWindow";
import { useClaudeUsage } from "../hooks/useClaudeUsage";
import { useSettings } from "../hooks/useSettings";
import { codexOverrideFor, findMappingEntry } from "../lib/animationCatalog";
import { codexRowNameFor } from "../lib/codexPets";
import { debugZoneClass } from "../lib/debugZone";
import {
  AVATAR_SHADOW_GAP,
  USAGE_PANEL_GAP,
  USAGE_PANEL_HEIGHT,
  avatarWindowHeight,
  avatarWindowSize,
} from "../lib/layout";
import { openSettingsWindow } from "../lib/settingsWindow";
import { startClampedDrag } from "../lib/windowDrag";
import { AnimationOverlay } from "./AnimationOverlay";
import { avatarBundleKey, type AnimationName } from "./avatarDefinition";
import { FittedAvatarEngine } from "./FittedAvatarEngine";
import { UsagePanel } from "./UsagePanel";

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

/**
 * Avatar + badge + ligne de rings de quotas Claude Code, seuls occupants de la fenêtre
 * "main" -- la bulle de notification vit dans sa propre fenêtre Tauri, spawnée à la
 * demande (cf. useBubbleWindow, NotificationBubbleWindow). La fenêtre "main" est
 * dimensionnée sur `avatarSize` (+ marge `AVATAR_SHADOW_GAP`, cf. layout.ts) et, si
 * `usagePanelEnabled`, agrandie en hauteur de `USAGE_PANEL_HEIGHT` pour loger `UsagePanel`
 * SOUS l'avatar (choix explicite -- un dock latéral a été essayé puis écarté) --
 * redimensionnée uniquement quand ces deux réglages changent (Settings, rare et
 * délibéré), jamais par notification.
 *
 * Le panneau vit DANS cette même fenêtre plutôt que dans une fenêtre séparée à faire
 * suivre l'avatar en continu pendant un drag : une fenêtre suiveuse resynchronisée par
 * IPC (`setPosition()`) à chaque frame de déplacement reproduirait exactement le flash
 * structurel documenté en mémoire projet (cf. LRN-057) -- la fenêtre "main" se déplaçant
 * déjà comme un seul bloc, l'élargir évite toute synchronisation à gérer.
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
  const {
    limits: usageLimits,
    consecutiveFailures: usageFailures,
    reconnectRequired: usageReconnectRequired,
  } = useClaudeUsage();

  // Taille RÉELLEMENT appliquée à l'avatar/fenêtre "main", distincte de `settings.avatarSize`
  // (qui change à chaque tick du slider Settings, plusieurs fois par seconde pendant un
  // drag). Si le CSS de l'avatar suivait `settings.avatarSize` directement, il grandirait
  // instantanément au-delà de la fenêtre OS -- encore à son ancienne taille tant que le
  // `setSize()` ci-dessous (débouncé) n'a pas eu lieu -- et serait rogné par son bord tout
  // du long du drag. En le faisant suivre `renderedAvatarSize` à la place, mis à jour dans
  // le MÊME timeout que le resize OS, le CSS et la fenêtre changent toujours ensemble :
  // rien ne bouge dans la fenêtre "main" pendant le drag du slider, puis les deux sautent
  // à la nouvelle taille au même instant une fois la valeur stabilisée.
  const [renderedAvatarSize, setRenderedAvatarSize] = useState(
    settings.avatarSize,
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      setRenderedAvatarSize(settings.avatarSize);
      void getCurrentWindow()
        .setSize(
          new LogicalSize(
            avatarWindowSize(settings.avatarSize),
            avatarWindowHeight(settings.avatarSize, settings.usagePanelEnabled),
          ),
        )
        .catch((error: unknown) =>
          console.error("[PetAvatar] setSize échoué", error),
        );
    }, 120);
    return () => clearTimeout(timeout);
  }, [settings.avatarSize, settings.usagePanelEnabled]);

  useBubbleWindow({
    lastEvent,
    notificationType,
    revision,
    avatarSize: renderedAvatarSize,
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
  const codexRow = codexOverrideFor(mappingEntry, animation);
  const avatarZoneSize = avatarWindowSize(renderedAvatarSize);

  return (
    <div
      data-zone="window"
      className={`relative flex h-full w-full flex-col ${debugZoneClass(settings.debugMode, "window")}`}
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

        startClampedDrag(
          e.screenX,
          e.screenY,
          avatarZoneSize,
          avatarWindowHeight(renderedAvatarSize, settings.usagePanelEnabled),
        );
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Zone avatar : carré fixe (`avatarWindowSize`), inchangé que le panneau soit
          affiché ou non -- garde intact tout le calcul de marge/shadow existant
          (AVATAR_SHADOW_GAP, cf. layout.ts). */}
      <div
        className="relative flex shrink-0 items-center justify-center"
        style={{ width: avatarZoneSize, height: avatarZoneSize }}
      >
        <div
          ref={containerRef}
          data-drag-handle
          data-zone="avatar"
          className={`relative flex cursor-grab items-center justify-center drop-shadow-[0_4px_6px_rgba(0,0,0,0.2)] transition-[width,height,background-color,scale,rotate,filter] duration-300 ease-out hover:-rotate-5 hover:scale-100 active:cursor-grabbing active:drop-shadow-[0_8px_10px_rgba(0,0,0,0.4)] active:scale-105 ${debugZoneClass(settings.debugMode, "avatar")}`}
          style={{
            width: renderedAvatarSize,
            height: renderedAvatarSize,
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
            codexRow={codexRow}
            size={renderedAvatarSize}
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
              ...(bundle.kind === "sprite"
                ? [`ligne Codex: ${codexRowNameFor(animation, codexRow)}`]
                : []),
              `hook: ${lastEvent ?? "-"}${
                toolName ? ` tool=${toolName}` : ""
              }${notificationType ? ` type=${notificationType}` : ""}`,
              `avatarSize: ${renderedAvatarSize}px`,
            ].join("\n")}
          </pre>
        </div>

        <AnimationOverlay
          animation={animation}
          revision={revision}
          enabled={settings.effectsEnabled}
          avatarSize={renderedAvatarSize}
          icon={mappingEntry?.icon}
          badgeIconColor={bundle.badgeIconColor}
          showDebugZone={settings.debugMode}
        />
      </div>

      {settings.usagePanelEnabled && (
        // `marginTop: -AVATAR_SHADOW_GAP` : la zone avatar réserve cette marge tout autour
        // pour son drop-shadow (cf. layout.ts) -- SANS cette remontée, le panneau s'accroche
        // sous cette marge (donc sous le carré "window" complet) au lieu de l'avatar visuel
        // réel, créant un écart visible entre le pet et les rings (constaté en usage réel).
        <div
          data-zone="usage-panel"
          className={`flex w-full shrink-0 items-center justify-center ${debugZoneClass(settings.debugMode, "usage-panel")}`}
          style={{
            height: USAGE_PANEL_HEIGHT,
            marginTop: -AVATAR_SHADOW_GAP + USAGE_PANEL_GAP,
          }}
        >
          <UsagePanel
            limits={usageLimits}
            consecutiveFailures={usageFailures}
            reconnectRequired={usageReconnectRequired}
          />
        </div>
      )}
    </div>
  );
}
