import { useLayoutEffect, useRef, useState } from "react";
import type {
  AnimationName,
  AvatarBundle,
  ProceduralAvatarBundle,
} from "./avatarDefinition";
import { SpriteAvatar } from "./SpriteAvatar";

// Même constante que `computeFitScale` (avatarDefinition.ts) -- viewBox fixe du moteur.
const VIEWBOX_HALF_EXTENT = 150;

interface FittedAvatarEngineProps<B extends AvatarBundle = AvatarBundle> {
  bundle: B;
  animation: AnimationName;
  size: number;
  className?: string;
  style?: React.CSSProperties;
}

// Mesure réelle du SVG rendu (getBBox), pas un calcul statique -- `computeFitScale`
// (avatarFitScale) n'utilise que width/height du body et ignore la perspective 3D du
// moteur (rotation de tête, profondeur), donc sous-estime le débordement pour un corps
// profond en rotation (constaté avec un cylindre communautaire crop malgré un fitScale
// statique à 1). `getBBox()` retourne les coordonnées internes du SVG, indépendantes d'un
// `transform` CSS déjà appliqué dessus -- pas de double compensation avec avatarFitScale.
function measureOverflowScale(svg: SVGSVGElement): number {
  const bbox = svg.getBBox();
  const maxAbs = Math.max(
    Math.abs(bbox.x),
    Math.abs(bbox.x + bbox.width),
    Math.abs(bbox.y),
    Math.abs(bbox.y + bbox.height),
  );
  return maxAbs > VIEWBOX_HALF_EXTENT ? VIEWBOX_HALF_EXTENT / maxAbs : 1;
}

/** Remplace l'application directe de `bundle.avatarFitScale` dans le style du SVG --
 * mesure au montage (et à chaque changement d'animation, qui change l'expression rendue)
 * via `useLayoutEffect` (avant le paint, donc aucun flash à la mauvaise taille). Limite
 * connue : ne capture que l'expression affichée au moment du montage/changement
 * d'animation, pas chaque expression traversée en cours de cycle -- suffisant en pratique
 * vu la fréquence des remounts (avatarBundleKey change à chaque avatar/couleur, animation
 * change à chaque step), un polling continu serait disproportionné ici. */
function FittedProceduralEngine({
  bundle,
  animation,
  size,
  className,
  style,
}: FittedAvatarEngineProps<ProceduralAvatarBundle>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(bundle.avatarFitScale);

  useLayoutEffect(() => {
    const svg = containerRef.current?.querySelector("svg");
    if (svg) setScale(measureOverflowScale(svg as SVGSVGElement));
  }, [bundle, animation]);

  return (
    <div ref={containerRef} style={{ display: "contents" }}>
      <bundle.AvatarEngine
        animation={animation}
        size={size}
        className={className}
        style={{
          ...style,
          transform: scale < 1 ? `scale(${scale})` : style?.transform,
          transformOrigin: "center",
        }}
      />
    </div>
  );
}

/** Point d'entrée unique pour les 3 consommateurs (pet flottant, cartes du picker, grille
 * Animation) : aiguille selon le type de bundle, ils n'ont pas à connaître la différence. */
export function FittedAvatarEngine({
  bundle,
  ...props
}: FittedAvatarEngineProps) {
  return bundle.kind === "sprite" ? (
    <SpriteAvatar bundle={bundle} {...props} />
  ) : (
    <FittedProceduralEngine bundle={bundle} {...props} />
  );
}
