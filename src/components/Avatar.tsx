import { createAvatar } from "@bible-strong/avatar-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import definition from "./avatar.json";

const AvatarEngine = createAvatar(definition);
export type AnimationName = keyof typeof definition.animations;

interface PetAvatarProps {
  animation: AnimationName;
  size?: number;
}

/**
 * Avatar centré dans la fenêtre. La fenêtre n'a pas de barre de titre
 * (decorations: false côté backend) -- on déclenche le déplacement natif via
 * l'API JS explicite plutôt que l'attribut `data-tauri-drag-region`, qui ne
 * traversait pas fiablement le SVG monté par le moteur d'avatar.
 */
export function PetAvatar({ animation, size = 240 }: PetAvatarProps) {
  return (
    <div
      className="pet-window"
      onMouseDown={() => {
        void getCurrentWindow().startDragging();
      }}
    >
      <AvatarEngine animation={animation} size={size} />
    </div>
  );
}
