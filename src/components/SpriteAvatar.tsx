import { useEffect, useRef } from "react";
import {
  CODEX_CELL_ASPECT,
  CODEX_COLUMNS,
  codexRowFor,
  type CodexRowName,
} from "../lib/codexPets";
import type { AnimationName, SpriteAvatarBundle } from "./avatarDefinition";

interface SpriteAvatarProps {
  bundle: SpriteAvatarBundle;
  animation: AnimationName;
  /** Surcharge par hook (niveau C de la table de correspondance) -- sinon la ligne se déduit
   * de `animation` (niveau B), cf. `codexRowNameFor`. */
  codexRow?: CodexRowName;
  /** Appelé si la spritesheet ne se charge pas (fichier supprimé ou corrompu). */
  onLoadError?: () => void;
  size: number;
  className?: string;
  style?: React.CSSProperties;
}

/** Pet Codex rendu depuis sa spritesheet : `background-image` sur toute la grille, ligne
 * choisie par `background-position-y` (fixe) et frames déroulées par `background-position-x`
 * animé en WAAPI avec `steps()` -- zéro re-render React par frame, même choix que les effets
 * du pet (cf. BDR-016). Toujours lissé (pas de `image-rendering: pixelated`) : le ratio
 * cellule -> `size` n'est pas entier, `pixelated` donnerait des pixels de largeurs inégales
 * (cf. roadmap étape 12, décision 4). La cellule (192x208, plus haute que large) est ajustée
 * en `contain` dans le carré `size`. */
export function SpriteAvatar({
  bundle,
  animation,
  codexRow,
  onLoadError,
  size,
  className,
  style,
}: SpriteAvatarProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const { row, frames: defaultFrames, fps } = codexRowFor(animation, codexRow);
  // Frames mesurées sur ce pet (cf. spriteFrames.ts), sinon valeur par défaut de la ligne ;
  // `|| ` et non `??` : 0 (ligne vide) retombe aussi sur le défaut.
  const frames = bundle.rowFrames?.[row] || defaultFrames;

  // Un `background-image` CSS n'expose aucune erreur de chargement : on sonde la même URL
  // avec un `Image` (déjà en cache du navigateur, pas de second décodage à payer).
  useEffect(() => {
    if (!onLoadError) return;
    const probe = new Image();
    probe.onerror = onLoadError;
    probe.src = bundle.spriteUrl;
    return () => {
      probe.onerror = null;
    };
  }, [bundle.spriteUrl, onLoadError]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    // Colonne k à `k / (COLUMNS - 1)` de la largeur (sémantique des % de background-position).
    // `jump-none` : `frames` paliers exactement, chacun tenu 1/frames de la durée.
    const lastColumn = ((frames - 1) / (CODEX_COLUMNS - 1)) * 100;
    const animationHandle = frame.animate(
      [
        { backgroundPositionX: "0%" },
        { backgroundPositionX: `${lastColumn}%` },
      ],
      {
        duration: (frames / fps) * 1000,
        easing: `steps(${frames}, jump-none)`,
        iterations: Infinity,
      },
    );
    return () => animationHandle.cancel();
  }, [frames, fps]);

  return (
    <div
      role="img"
      aria-label={bundle.name}
      className={className}
      style={{
        ...style,
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        ref={frameRef}
        style={{
          height: size,
          width: size * CODEX_CELL_ASPECT,
          backgroundImage: `url("${bundle.spriteUrl}")`,
          backgroundRepeat: "no-repeat",
          backgroundSize: `${CODEX_COLUMNS * 100}% ${bundle.rows * 100}%`,
          backgroundPositionY: `${(row / (bundle.rows - 1)) * 100}%`,
        }}
      />
    </div>
  );
}
