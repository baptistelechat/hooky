/** Classes Tailwind (mode debug, cf. Avatar.tsx) : contour + fond assortis + étiquette
 * (`content: attr(data-zone)`, lit l'attribut `data-zone` posé sur la zone elle-même) --
 * une couleur distincte par zone plutôt qu'un simple binaire draguable/mort, pour
 * distinguer les zones de la fenêtre "main" d'un coup d'œil. Ne touche jamais
 * `position` : chaque zone gère déjà la sienne (`relative`/`absolute`) -- l'écraser ici
 * casserait le positionnement réel (badge/bulle en `absolute`, bug rencontré en pratique
 * avec une première version en CSS brut qui forçait `position: relative` partout). */
const ZONE_LABEL_BASE =
  "before:content-[attr(data-zone)] before:absolute before:left-0 before:z-40 before:bg-black/65 before:px-0.5 before:font-mono before:text-[9px] before:text-white before:pointer-events-none";
// Étiquette ancrée en haut par défaut, en bas sur demande (cf. `labelBottom` plus bas) --
// utile pour "window" quand `flipped` : les autres étiquettes (bubble-zone/avatar) se
// retrouvent alors TOUTES en haut de la fenêtre (le groupe est compacté contre le bord haut),
// se chevauchant avec celle de "window" si elle restait, elle aussi, ancrée en haut.
const ZONE_LABEL_TOP = `${ZONE_LABEL_BASE} before:top-0`;
const ZONE_LABEL_BOTTOM = `${ZONE_LABEL_BASE} before:bottom-0`;

// Classes complètes et littérales (pas de couleur construite par interpolation) --
// Tailwind ne scanne que des chaînes statiques présentes telles quelles dans le fichier.
// `bubble`/`badge` : contour seul, sans fond -- ce sont de vrais éléments visibles (bulle
// blanche, badge blanc) dont la couleur ne doit pas changer en mode debug, contrairement
// aux zones de layout invisibles (window/bubble-zone/avatar) où un fond teinté aide à voir
// l'étendue réelle de la zone.
const ZONE_COLORS = {
  window: "outline-red-500/80 bg-red-500/10",
  avatar: "outline-green-500/80 bg-green-500/15",
  "bubble-zone": "outline-yellow-500/80 bg-yellow-500/10",
  bubble: "outline-purple-500/80",
  badge: "outline-pink-500/80",
} as const;

export type DebugZone = keyof typeof ZONE_COLORS;

export function debugZoneClass(
  debugMode: boolean,
  zone: DebugZone,
  labelBottom = false,
): string {
  if (!debugMode) return "";
  const label = labelBottom ? ZONE_LABEL_BOTTOM : ZONE_LABEL_TOP;
  return `outline outline-dashed outline-1 -outline-offset-1 ${ZONE_COLORS[zone]} ${label}`;
}
