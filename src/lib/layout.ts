// Doit correspondre au slider de Settings (max={240}, cf. SettingsControls.tsx) et à la
// hauteur de fenêtre dans tauri.conf.json (330 = AVATAR_SLOT_HEIGHT + les 90px réservés à
// la bulle) -- carré fixe dans lequel l'avatar reste centré quel que soit `avatarSize`
// (cf. Avatar.tsx). Partagé avec NotificationBubble : la bulle doit s'ancrer au bord RÉEL
// de l'avatar (qui varie avec `avatarSize`, cf. bubbleBottomOffset), pas au bord de ce
// slot -- sinon un avatar plus petit que 240 laisse un vide entre la bulle et l'avatar.
export const AVATAR_SLOT_HEIGHT = 240;

/** Décalage (en px, depuis le bas de la fenêtre) du bord haut réel de l'avatar : celui-ci
 * est centré dans un carré fixe de `AVATAR_SLOT_HEIGHT`, donc son bord haut est à
 * `(AVATAR_SLOT_HEIGHT - avatarSize) / 2` du haut du slot, soit
 * `AVATAR_SLOT_HEIGHT - (AVATAR_SLOT_HEIGHT - avatarSize) / 2` de son bas -- le slot étant
 * lui-même collé au bas de la fenêtre. */
export function bubbleBottomOffset(avatarSize: number): number {
  return AVATAR_SLOT_HEIGHT - (AVATAR_SLOT_HEIGHT - avatarSize) / 2;
}
