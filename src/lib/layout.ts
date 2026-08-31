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
 * l'écran (drag, cf. windowDrag.ts, ET positionnement bulle, cf. useBubbleWindow.ts /
 * NotificationBubbleWindow.tsx) -- même valeur partagée pour un comportement cohérent. */
export const EDGE_PADDING = 12;

/** Espace réservé du côté OPPOSÉ à l'avatar (au-dessus du corps si la bulle est en bas de
 * l'avatar -- flipped --, en-dessous sinon) pour que le `shadow-lg` du corps de la bulle
 * (qui déborde de sa boîte de layout) ne soit jamais rogné par le bord de la fenêtre --
 * même mécanique que `BUBBLE_TAIL_GAP` côté avatar, pour le côté sans pointe. */
export const BUBBLE_SHADOW_GAP = 16;
