// Doit correspondre au slider de Settings (max={240}, cf. SettingsControls.tsx) -- hauteur
// maximale de l'avatar, centrée dans la fenêtre quel que soit `avatarSize` (cf. Avatar.tsx,
// `avatarCenterOffsetY`).
export const AVATAR_SLOT_HEIGHT = 240;

/** Bande réservée à la bulle de notification, DE CHAQUE CÔTÉ de l'avatar (cf.
 * `avatarCenterOffsetY` -- l'avatar est centré dans la fenêtre, pas flush à un bord, donc
 * les deux côtés doivent pouvoir accueillir la bulle selon `flipped`) -- aussi le seuil de
 * proximité au bord de l'écran déclenchant le flip (cf. useAvatarScreenLayout) : sous ce
 * seuil, il ne reste pas assez de place pour y afficher la bulle normalement. */
export const BUBBLE_ZONE_HEIGHT = 90;

/** Dimensions réelles de la fenêtre "main" -- doivent matcher `width`/`height` dans
 * tauri.conf.json. `WINDOW_HEIGHT` réserve `BUBBLE_ZONE_HEIGHT` des DEUX côtés de l'avatar
 * (cf. `avatarCenterOffsetY` -- position CENTRÉE, indépendante de `flipped` : un flip ne
 * déplace plus jamais l'avatar ni la fenêtre, seule la bulle change de côté en CSS pur, cf.
 * mémoire projet -- l'ancien schéma "avatar flush à un bord" ne réservait cet espace que
 * d'un côté, mais nécessitait de repositionner la fenêtre à chaque flip, source d'un flash
 * inévitable : la mise à jour CSS est synchrone, le repositionnement de fenêtre passe par
 * l'IPC Tauri, toujours légèrement plus lent). `WINDOW_WIDTH` (480) est volontairement bien
 * plus large que `AVATAR_SLOT_HEIGHT`/l'avatar : le clamp de `startClampedDrag` laisse
 * l'avatar aller flush au bord de l'écran, ce qui pousse le CÔTÉ OPPOSÉ de la fenêtre loin
 * du bord -- c'est cet espace qui donne à `BUBBLE_MAX_WIDTH` la place de s'y décaler
 * (`shiftX`, cf. NotificationBubble) sans jamais être rognée par le bord physique de
 * l'écran. Marge dimensionnée pour le pire cas (avatarSize=80, le minimum du slider
 * Settings) : voir le calcul dans la note de BUBBLE_MAX_WIDTH ci-dessous.
 */
export const WINDOW_WIDTH = 480;
export const WINDOW_HEIGHT = AVATAR_SLOT_HEIGHT + 2 * BUBBLE_ZONE_HEIGHT;

/** Largeur MAXIMALE fixe de la bulle de notification -- volontairement découplée de
 * `WINDOW_WIDTH` (pas de `max-w-full`, cf. NotificationBubble) : si la bulle grossissait
 * avec la fenêtre, élargir `WINDOW_WIDTH` n'apporterait jamais assez de marge de manœuvre
 * pour `shiftX`. Avec cette valeur fixe, `WINDOW_WIDTH` doit seulement satisfaire
 * `WINDOW_WIDTH >= 2 * BUBBLE_MAX_WIDTH - avatarSize` pour le PLUS PETIT avatarSize possible
 * (80, cf. slider Settings) -- soit `>= 440` ici ; 480 laisse une marge de sécurité. */
export const BUBBLE_MAX_WIDTH = 260;

/** Offset vertical (px logiques) de l'avatar depuis le haut de la fenêtre -- TOUJOURS
 * centré, quel que soit `flipped` (cf. commentaire de `WINDOW_HEIGHT`). Fonction PURE
 * partagée entre `useAvatarScreenLayout` (seuil de flip) et `startClampedDrag` (position de
 * fenêtre dérivée de la position d'avatar) -- seule définition de cette relation. */
export function avatarCenterOffsetY(avatarSize: number): number {
  return (WINDOW_HEIGHT - avatarSize) / 2;
}
