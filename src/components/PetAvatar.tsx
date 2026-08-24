import { getCurrentWindow } from "@tauri-apps/api/window";
import { Cubee, type AnimationName } from "../avatar/cubee.index";

interface PetAvatarProps {
  animation: AnimationName;
  size?: number;
}

/**
 * Avatar Cubee centré dans la fenêtre. La fenêtre n'a pas de barre de titre
 * (decorations: false côté backend) -- on déclenche le déplacement natif via
 * l'API JS explicite plutôt que l'attribut `data-tauri-drag-region`, qui ne
 * traversait pas fiablement le SVG monté imperativement par le moteur Cubee.
 */
export function PetAvatar({ animation, size = 240 }: PetAvatarProps) {
  return (
    <div
      className="pet-window"
      onMouseDown={() => {
        void getCurrentWindow().startDragging();
      }}
    >
      <Cubee animation={animation} size={size} />
    </div>
  );
}
