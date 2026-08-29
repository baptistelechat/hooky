import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useRef } from "react";
import { useAnimationEffects } from "../hooks/useAnimationEffects";
import { useAvatarBundle } from "../hooks/useAvatarBundle";
import { useSettings } from "../hooks/useSettings";
import { findMappingEntry } from "../lib/animationCatalog";
import { AnimationOverlay } from "./AnimationOverlay";
import { avatarBundleKey, type AnimationName } from "./avatarDefinition";
import { FittedAvatarEngine } from "./FittedAvatarEngine";
import { NotificationBubble } from "./NotificationBubble";
import { AVATAR_SLOT_HEIGHT } from "../lib/layout";

export type { AnimationName };

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
 * Avatar + bulle de notification, centrés dans la fenêtre "main" (cf. NotificationBubble,
 * fusionnée ici -- plus une fenêtre Tauri séparée, cf. BDR-035 en mémoire projet). La
 * fenêtre n'a pas de barre de titre (decorations: false côté backend) -- on déclenche le
 * déplacement natif via l'API JS explicite plutôt que l'attribut `data-tauri-drag-region`,
 * qui ne traversait pas fiablement le SVG monté par le moteur d'avatar.
 *
 * Le handler mousedown vit sur le wrapper RACINE (couvre à la fois l'avatar et la bulle,
 * cf. NotificationBubble) -- restreindre le drag aux seules zones peintes (SVG en
 * `pointer-events: visiblePainted`, reste en `none`) a été tenté puis abandonné : sans
 * `setIgnoreCursorEvents` fonctionnel pour laisser les clics traverser jusqu'à l'appli
 * derrière (bug Tauri/WebView2 non résolu sous Windows, tauri-apps/tauri#11461, fermé "not
 * planned"), la restriction ne faisait que casser le drag/double-clic pour un bénéfice nul
 * -- retour au comportement simple d'origine, cf. mémoire projet.
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
      className="relative flex h-full w-full cursor-grab flex-col items-center justify-end overflow-hidden active:cursor-grabbing"
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
      <NotificationBubble />

      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{ width: "100%", height: AVATAR_SLOT_HEIGHT }}
      >
        <div
          ref={containerRef}
          className="relative flex items-center justify-center drop-shadow-[0_4px_6px_rgba(0,0,0,0.2)] transition-[width,height,background-color,scale,rotate,filter] duration-300 ease-out hover:-rotate-5 hover:scale-100 active:drop-shadow-[0_8px_10px_rgba(0,0,0,0.4)] active:scale-105"
          style={{
            width: settings.avatarSize,
            height: settings.avatarSize,
            background: settings.debugMode
              ? "rgba(0, 0, 0, 0.5)"
              : "transparent",
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
          badgeIconColor={bundle.badgeIconColor}
        />
      </div>
    </div>
  );
}
