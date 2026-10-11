import { useDotsSheet } from "../hooks/useDotsSheet";
import { dotsStateFor } from "../lib/dotsAvatars";
import type { AnimationName, DotsAvatarBundle } from "./avatarDefinition";

interface DotsAvatarProps {
  bundle: DotsAvatarBundle;
  animation: AnimationName;
  size: number;
  className?: string;
  style?: React.CSSProperties;
}

/** Personnage Dots Lab : un SVG animé par état (cf. `splitDotsSheet`), affiché dans un `<img>`.
 * Changer d'état change simplement `src` -- l'animation est dans le fichier (SMIL), zéro
 * re-render React par frame, et le navigateur garde l'image précédente à l'écran tant que la
 * suivante n'est pas prête. Rien à afficher tant que la planche charge (quelques ms). */
export function DotsAvatar({
  bundle,
  animation,
  size,
  className,
  style,
}: DotsAvatarProps) {
  const sheet = useDotsSheet(bundle.sheetUrl);

  if (!sheet) {
    return (
      <div
        className={className}
        style={{ ...style, width: size, height: size }}
      />
    );
  }

  return (
    <img
      src={sheet.urls[dotsStateFor(animation)]}
      alt={bundle.name}
      draggable={false}
      className={className}
      // `pointer-events: none` : le drag du pet est piloté par son conteneur (cf. Avatar.tsx),
      // l'image ne doit ni démarrer un drag natif ni intercepter le clic droit.
      style={{ ...style, width: size, height: size, pointerEvents: "none" }}
    />
  );
}
