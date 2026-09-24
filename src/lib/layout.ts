/** Taille de l'aperçu d'un avatar sur une carte du picker (Avatar) -- partagée entre la
 * carte, la carte "+" (même gabarit) et la section Pets Codex. */
export const AVATAR_PREVIEW_SIZE = 56;

export const BUBBLE_MAX_WIDTH = 260;
/** Bien plus large que `BUBBLE_MAX_WIDTH` -- la fenêtre "bubble" est toujours centrée
 * exactement sur l'avatar (jamais clampée au moniteur, cf. useBubbleWindow), donc peut
 * légèrement déborder de l'écran quand l'avatar est collé à un bord (transparent, sans
 * incidence). Cette marge donne au CORPS de la bulle (`BUBBLE_MAX_WIDTH`) la place de se
 * décaler (`shiftX`, cf. NotificationBubbleWindow) pour rester visible à l'écran sans être
 * lui-même rogné par le bord de CETTE fenêtre -- même mécanique que l'ancienne bulle
 * intégrée à "main" (cf. mémoire projet), transposée à une fenêtre dédiée.
 */
export const BUBBLE_WINDOW_WIDTH = 520;

/** Espace réservé au-dessus/en-dessous du corps de la bulle pour que la pointe (qui dépasse
 * de 5px du corps) ne soit jamais rognée par le bord de la fenêtre. */
export const BUBBLE_TAIL_GAP = 5;

/** Marge de sécurité pour ne jamais coller l'avatar ou la bulle pile contre le bord de
 * l'écran (drag, cf. windowDrag.ts, ET positionnement bulle, cf. bubbleWindow.ts /
 * NotificationBubbleWindow.tsx) -- même valeur partagée pour un comportement cohérent.
 * Revenu à 12 (depuis 48, cf. BDR-059) : les trois calculs utilisent maintenant
 * `monitor.workArea` (API Tauri, exclut la barre des tâches quelle que soit sa position)
 * au lieu de `monitor.size()`/`monitor.position()` (résolution PHYSIQUE) -- la marge
 * anti-taskbar n'est donc plus approximée ici, `EDGE_PADDING` ne sert plus qu'à éviter de
 * coller pile contre le bord de la VRAIE zone utile. Un 48px uniforme sur les 4 côtés
 * masquait ce fix : sans taskbar visible (haut/gauche/droite), l'écart perçu était bien
 * plus grand que côté taskbar (souvent en bas), constaté par Baptiste. */
export const EDGE_PADDING = 12;

/** Espace réservé du côté OPPOSÉ à l'avatar (au-dessus du corps si la bulle est en bas de
 * l'avatar -- flipped --, en-dessous sinon) pour que le `shadow-lg` du corps de la bulle
 * (qui déborde de sa boîte de layout) ne soit jamais rogné par le bord de la fenêtre --
 * même mécanique que `BUBBLE_TAIL_GAP` côté avatar, pour le côté sans pointe. */
export const BUBBLE_SHADOW_GAP = 16;

/** Marge réservée sur TOUS les côtés de la fenêtre "main" (contrairement à
 * `BUBBLE_SHADOW_GAP`, à sens unique) -- le `drop-shadow` de l'avatar (jusqu'à
 * `blur:10px` + `offset:8px` en état actif, plus `scale-105`) déborde de sa propre boîte
 * dans n'importe quelle direction selon l'interaction (hover, drag), donc doit avoir de la
 * place tout autour. La fenêtre "main" est dimensionnée à `avatarSize + AVATAR_SHADOW_GAP *
 * 2` (cf. `avatarWindowSize`) au lieu d'`avatarSize` pile -- même mécanique que
 * `BUBBLE_SHADOW_GAP`, cf. BDR-060 en mémoire projet. */
export const AVATAR_SHADOW_GAP = 24;

/** Taille réelle de la fenêtre "main" pour un `avatarSize` donné -- l'avatar reste centré à
 * sa taille configurée (`items-center justify-center` déjà en place), la marge apparaît
 * automatiquement des deux côtés sur chaque axe. */
export function avatarWindowSize(avatarSize: number): number {
  return avatarSize + AVATAR_SHADOW_GAP * 2;
}

/** Hauteur du panneau de quotas Claude Code (cf. UsagePanel), accolé SOUS la zone avatar
 * quand `settings.usagePanelEnabled` -- même fenêtre "main" (pas une fenêtre séparée à
 * faire suivre pendant le drag, cf. LRN-057 en mémoire projet : une fenêtre suiveuse
 * resynchronisée par IPC pendant un déplacement continu crée un flash structurel jamais
 * éliminable). Agrandir la fenêtre "main" elle-même, qui se déplace déjà comme un seul
 * bloc, ne demande aucune synchronisation. Rings alignés en ligne (pas en colonne) dans ce
 * panneau -- la largeur disponible (celle de la zone avatar) suffit largement pour 3 rings
 * de 44px, alors qu'empiler 3 rings + libellés en dessous de l'avatar aurait vite dépassé
 * la hauteur de la fenêtre. */
export const USAGE_PANEL_HEIGHT = 56;

/** Écart supplémentaire entre l'avatar et le panneau de quotas : la cellule d'une spritesheet
 * Codex remplit son cadre jusqu'en bas, le pet paraissait collé aux rings -- appliqué à tous
 * les avatars par cohérence. Consommé sur la marge basse déjà réservée par la fenêtre
 * (`AVATAR_SHADOW_GAP`, sous le panneau) -- la hauteur de fenêtre ne change pas. */
export const USAGE_PANEL_GAP = 4;

/** Hauteur totale de la fenêtre "main" -- carrée (`avatarWindowSize`) plus le panneau de
 * quotas s'il est activé. La largeur reste toujours `avatarWindowSize(avatarSize)`. */
export function avatarWindowHeight(
  avatarSize: number,
  usagePanelEnabled: boolean,
): number {
  return (
    avatarWindowSize(avatarSize) + (usagePanelEnabled ? USAGE_PANEL_HEIGHT : 0)
  );
}
