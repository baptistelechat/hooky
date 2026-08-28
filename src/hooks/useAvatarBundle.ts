import { useMemo } from "react";
import {
  getAvatarBundle,
  type AvatarBundle,
  type AvatarColorOverride,
} from "@/components/avatarDefinition";
import { useCustomAvatars } from "@/hooks/useCustomAvatars";

/** Bundle live d'un avatar, override couleur appliqué (persisté par avatarId dans
 * `avatarColorOverrides`, cf. settings.ts). Mémoïsé sur les valeurs primitives body/eyes
 * -- pas l'objet `colorOverride` lui-même, recréé à chaque event settings IPC (cloné
 * structurellement) même quand rien n'a changé -- pour ne rappeler `getAvatarBundle`
 * (donc `createAvatar`, reconstruction complète du SVG) que quand la couleur change
 * vraiment. Partagé par le pet flottant, la carte de picker et la grille de validation
 * d'animation : les 3 doivent refléter la même couleur éditée. */
export function useAvatarBundle(
  avatarId: string,
  colorOverride: AvatarColorOverride | undefined,
): AvatarBundle {
  const [customAvatars] = useCustomAvatars();
  const body = colorOverride?.body;
  const eyes = colorOverride?.eyes;
  return useMemo(
    () => getAvatarBundle(avatarId, { body, eyes }, customAvatars),
    [avatarId, body, eyes, customAvatars],
  );
}
