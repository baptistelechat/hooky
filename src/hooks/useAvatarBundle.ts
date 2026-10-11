import { useMemo } from "react";
import {
  ensureReadableOnWhite,
  getAvatarBundle,
  type AvatarBundle,
  type AvatarColorOverride,
} from "@/components/avatarDefinition";
import { useCodexPets } from "@/hooks/useCodexPets";
import { useCustomAvatars } from "@/hooks/useCustomAvatars";
import { useDotsSheet } from "@/hooks/useDotsSheet";

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
  const codexPets = useCodexPets();
  const body = colorOverride?.body;
  const eyes = colorOverride?.eyes;
  const bundle = useMemo(
    () => getAvatarBundle(avatarId, { body, eyes }, customAvatars, codexPets),
    [avatarId, body, eyes, customAvatars, codexPets],
  );
  // Personnage Dots Lab : la couleur du corps (donc du badge) n'est lisible qu'une fois sa
  // planche chargée -- même enrichissement asynchrone que `badgeColor` pour un pet Codex.
  const dotsColor = useDotsSheet(
    bundle.kind === "dots" ? bundle.sheetUrl : undefined,
  )?.color;
  return useMemo(
    () =>
      bundle.kind === "dots" && dotsColor
        ? { ...bundle, badgeIconColor: ensureReadableOnWhite(dotsColor) }
        : bundle,
    [bundle, dotsColor],
  );
}
