import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useRef } from "react";
import { useAnimationEffects } from "../hooks/useAnimationEffects";
import { useAvatarBundle } from "../hooks/useAvatarBundle";
import { useAvatarScreenLayout } from "../hooks/useAvatarScreenLayout";
import { useSettings } from "../hooks/useSettings";
import { findMappingEntry } from "../lib/animationCatalog";
import { debugZoneClass } from "../lib/debugZone";
import { avatarCenterOffsetY } from "../lib/layout";
import { startClampedDrag } from "../lib/windowDrag";
import { AnimationOverlay } from "./AnimationOverlay";
import { avatarBundleKey, type AnimationName } from "./avatarDefinition";
import { FittedAvatarEngine } from "./FittedAvatarEngine";
import { NotificationBubble } from "./NotificationBubble";

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
 * Avatar + bulle de notification, centrés dans la fenêtre "main" (cf. NotificationBubble,
 * fusionnée ici -- plus une fenêtre Tauri séparée, cf. BDR-035 en mémoire projet). La
 * fenêtre n'a pas de barre de titre (decorations: false côté backend) -- le déplacement est
 * piloté à la main (`startClampedDrag`, cf. src/lib/windowDrag.ts) plutôt que via
 * `startDragging()`/`data-tauri-drag-region` : la boucle de déplacement interactive de l'OS
 * déclenchée par ces deux mécanismes garde la main sur la position de la fenêtre pendant
 * tout le drag, rendant impossible d'empêcher l'avatar de déborder de l'écran (constaté en
 * test réel, cf. mémoire projet) -- en pilotant nous-mêmes chaque mise à jour de position,
 * un clamp aux limites du moniteur peut réellement s'appliquer en continu.
 *
 * Le handler mousedown vit sur le wrapper RACINE (couvre à la fois l'avatar et la bulle,
 * cf. NotificationBubble) -- restreindre le drag aux seules zones peintes (SVG en
 * `pointer-events: visiblePainted`, reste en `none`) a été tenté puis abandonné : sans
 * `setIgnoreCursorEvents` fonctionnel pour laisser les clics traverser jusqu'à l'appli
 * derrière (bug Tauri/WebView2 non résolu sous Windows, tauri-apps/tauri#11461, fermé "not
 * planned"), la restriction ne faisait que casser le drag/double-clic pour un bénéfice nul
 * -- retour au comportement simple d'origine, cf. mémoire projet.
 *
 * Le guard `[data-drag-handle]` ci-dessous est différent de cette tentative-là : il ne
 * touche pas au `pointer-events` (donc aucun risque de casser le click-through), il ignore
 * juste le mousedown en JS quand la cible n'est ni l'avatar ni la bulle -- évite de faire
 * bouger la fenêtre depuis une zone transparente sans rien dessus (ex: la bande réservée à
 * la bulle quand elle n'affiche rien, ou les marges autour d'un avatar réduit).
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
  const { flipped, shiftX, applyFlippedFromDrag } = useAvatarScreenLayout(
    settings.avatarSize,
  );
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
  // TOUJOURS la même valeur quel que soit `flipped` -- l'avatar est centré dans la fenêtre
  // et n'en bouge plus jamais lors d'un flip (cf. layout.ts, `avatarCenterOffsetY` et
  // commentaire du wrapper racine ci-dessous).
  const avatarTop = avatarCenterOffsetY(settings.avatarSize);

  return (
    <div
      data-zone="window"
      // L'avatar (`slot` ci-dessous) est TOUJOURS positionné en absolu à la même hauteur
      // (`avatarTop`, cf. plus haut) -- un flip ne le déplace JAMAIS, ni ne déplace la
      // fenêtre. Seule `bubble-zone` (ci-dessous), également en absolu, bascule au-dessus
      // ou en-dessous de l'avatar selon `flipped` : un pur changement CSS local (`top`/
      // `bottom`), sans AUCUN effet de bord sur la position de la fenêtre. C'est ce qui
      // élimine le flash constaté avec le schéma précédent -- où l'offset de l'avatar
      // dépendait de `flipped`, nécessitant un repositionnement de fenêtre (`setPosition()`,
      // IPC Tauri asynchrone) synchronisé avec le changement CSS (synchrone, lui) : les deux
      // ne pouvaient jamais être parfaitement atomiques, d'où un flash inévitable à chaque
      // flip (cf. mémoire projet). Swap 100% instantané pour l'instant (pas d'animation) --
      // une transition viendra dans un second temps, une fois cette base validée en usage
      // réel.
      className={`relative h-full w-full overflow-hidden ${debugZoneClass(settings.debugMode, "window", flipped)}`}
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
          settings.avatarSize,
          flipped,
          applyFlippedFromDrag,
        );
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Position ABSOLUE, TOUJOURS ancrée par `top` (jamais `bottom` -- deux propriétés
          CSS différentes ne peuvent pas s'interpoler dans une transition, cf. mémoire
          projet) : flippé, `top` = bas de l'avatar (grandit vers le bas) ; non flippé,
          `top` = haut de l'avatar mais `translateY(-100%)` remonte la boîte de SA PROPRE
          hauteur (grandit vers le haut) -- un pourcentage de `translateY` est résolu par le
          navigateur à partir de la hauteur RÉELLE de la boîte, jamais mesurée en JS (donc
          aucun risque de "course" contre une hauteur qui grandit pendant l'effet machine à
          écrire, cf. mémoire projet). `top` ET `transform` sont tous deux transitionnables :
          la bascule devient fluide sans jamais dépendre de la hauteur du texte. Le
          chevauchement avec l'avatar reste impossible par construction : l'avatar occupe
          toujours le MÊME espace (`avatarTop` à `avatarTop + avatarSize`), et la bulle
          grandit à l'opposé de cet espace, jamais dedans. */}
      <div
        data-zone="bubble-zone"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: flipped ? avatarTop + settings.avatarSize : avatarTop,
          transform: flipped ? undefined : "translateY(-100%)",
        }}
        className={`pointer-events-none flex justify-center px-2 transition-[top,transform] duration-200 ease-out ${debugZoneClass(settings.debugMode, "bubble-zone")}`}
      >
        <NotificationBubble flipped={flipped} shiftX={shiftX} />
      </div>

      {/* Avatar ET badge (AnimationOverlay, sibling ci-dessous) sont tous deux DANS ce slot,
          donc se déplacent ensemble sans logique de flip séparée pour le badge. Position
          ABSOLUE et FIXE (`avatarTop`, TOUJOURS la même valeur quel que soit `flipped`, cf.
          plus haut) : l'avatar ne bouge JAMAIS lors d'un flip, seule `bubble-zone`
          ci-dessus bascule de côté -- snap instantané malgré tout pendant un DRAG (l'avatar
          suit directement le curseur au pixel près, cf. windowDrag.ts) puisque c'est alors
          la FENÊTRE elle-même qui se déplace, pas cette position interne. */}
      <div
        data-zone="slot"
        className={`flex justify-center items-center ${debugZoneClass(settings.debugMode, "slot")}`}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: avatarTop,
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
              `layout: flipped=${flipped} shiftX=${Math.round(shiftX)}px`,
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
