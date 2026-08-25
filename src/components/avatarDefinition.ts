import { createAvatar } from "@bible-strong/avatar-react";
import rawDefinition from "./avatar.json";

// Le Studio (outil d'export officiel bible-strong) autorise tipRoundness/baseRoundness
// jusqu'à 2 et morphRoundness au-delà de 1 via son UI, mais le schéma de validation
// runtime (@bible-strong/avatar-core, $defs/roundness) plafonne ces 4 champs à 1 -- un
// avatar exporté du Studio peut donc être rejeté par avatar-react au montage (throw
// synchrone dans son composant, aucun error boundary autour ici -> fenêtre transparente
// vide, tray/backend intacts). On clamp plutôt que de faire planter l'app sur un export
// du Studio ; testé avec l'avatar "Onee" (cone, tipRoundness/baseRoundness: 2).
const ROUNDNESS_FIELDS = [
  "roundness",
  "morphRoundness",
  "tipRoundness",
  "baseRoundness",
] as const;

function clampSurface<T extends Record<string, unknown>>(surface: T): T {
  const clamped = { ...surface };
  for (const field of ROUNDNESS_FIELDS) {
    const value = clamped[field];
    if (typeof value === "number" && (value < 0 || value > 1)) {
      console.warn(
        `[avatar] "${field}" hors bornes (${value}), plafonné à [0, 1].`,
      );
      // @ts-expect-error -- écriture dynamique sur une clé connue de ROUNDNESS_FIELDS
      clamped[field] = Math.min(1, Math.max(0, value));
    }
  }
  return clamped;
}

interface BodyNode extends Record<string, unknown> {
  surface: Record<string, unknown>;
}

function clampDefinition<T extends typeof rawDefinition>(def: T): T {
  // `nodes` est toujours `[]` dans les avatars actuels (le Studio n'en génère pas
  // encore ici) -- TS l'infère donc en `never[]`, d'où le cast pour rester générique
  // si un avatar en ajoute un jour.
  const nodes = def.body.nodes as unknown as BodyNode[];
  return {
    ...def,
    body: {
      ...def.body,
      primary: clampSurface(def.body.primary),
      nodes: nodes.map((node) => ({
        ...node,
        surface: clampSurface(node.surface),
      })),
    },
  };
}

export const definition = clampDefinition(rawDefinition);
export const AvatarEngine = createAvatar(definition);

// Le viewBox du moteur est fixe ("-150 -150 300 300", cf. dist du package) -- un avatar
// avec des `body.nodes[]` (satellites autour du corps principal, ex. "Sunee") peut
// déborder de la fenêtre fixe (240px, non-redimensionnable). Un premier essai mesurait
// la vraie boîte englobante du SVG rendu (`getBBox()`) mais captait aussi des éléments
// non visibles du moteur -- ça faisait rétrécir même les avatars sans nodes (ex. Cubee)
// qui n'en avaient pourtant pas besoin. Calcul statique depuis les données déclarées à la
// place : approximation 2D (position x/y, z et rotation ignorés) volontairement
// conservatrice -- suffisant pour détecter un vrai débordement sans jamais toucher un
// avatar qui tenait déjà dans la fenêtre.
const VIEWBOX_HALF_EXTENT = 150;

interface Extent2D {
  width: number;
  height: number;
  x?: number;
  y?: number;
}

// Distance euclidienne du centre + rayon du satellite -- traiter le node comme un
// cercle et sommer axe par axe (`|x| + width/2`) sous-estime son extension réelle dès
// qu'il est positionné en diagonale (ex. Sunee, x≈-94, y≈-95 : ~95 en axe séparé contre
// ~134+rayon en distance réelle), d'où le crop qui persistait malgré le clamp.
function halfExtent({ width, height, x = 0, y = 0 }: Extent2D): number {
  return Math.sqrt(x * x + y * y) + Math.max(width, height) / 2;
}

function computeFitScale(def: typeof definition): number {
  const nodes = def.body.nodes as unknown as Array<{
    surface: { width: number; height: number };
    position?: [number, number, number];
  }>;
  if (nodes.length === 0) return 1;

  const primary = def.body.primary as { width: number; height: number };
  const extents = [
    halfExtent(primary),
    ...nodes.map((node) =>
      halfExtent({
        width: node.surface.width,
        height: node.surface.height,
        x: node.position?.[0],
        y: node.position?.[1],
      }),
    ),
  ];
  const maxExtent = Math.max(...extents);
  return maxExtent > VIEWBOX_HALF_EXTENT ? VIEWBOX_HALF_EXTENT / maxExtent : 1;
}

export const avatarFitScale = computeFitScale(definition);

// WCAG relative luminance -- même formule que le calcul de contraste standard
// (https://www.w3.org/TR/WCAG21/#dfn-relative-luminance).
function relativeLuminance(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16);
  const toLinear = (channel: number) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const r = toLinear((n >> 16) & 255);
  const g = toLinear((n >> 8) & 255);
  const b = toLinear(n & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastAgainstWhite(hex: string): number {
  return 1.05 / (relativeLuminance(hex) + 0.05);
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => Math.round(c).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl([r, g, b]: [number, number, number]): [
  number,
  number,
  number,
] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];

  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h *= 60;
  return [h < 0 ? h + 360 : h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

// Seuil WCAG AA pour les éléments graphiques/UI (pas du texte, où ce serait 4.5).
const MIN_BADGE_ICON_CONTRAST = 3;
// Pas à pas de réduction de luminosité HSL par itération -- fin pour ne pas assombrir
// plus que nécessaire, un ratio "parfait" exact demanderait de résoudre la formule de
// luminance relative (non-linéaire, gamma-corrigée) pour L, plus cher qu'utile ici.
const LIGHTNESS_STEP = 0.02;

// Le badge (AnimationOverlay) est toujours sur fond blanc -- un `colors.body` clair
// (ex. "Onee", #dbe2f5) y devient illisible. Plutôt que de sauter sur `colors.eyes` (une
// couleur sans rapport avec le body), on assombrit body (même teinte/saturation, L
// réduite en HSL) jusqu'au seuil de lisibilité -- l'icône reste visuellement liée à
// l'avatar plutôt que de piocher une couleur arbitraire.
function ensureReadableOnWhite(hex: string): string {
  if (contrastAgainstWhite(hex) >= MIN_BADGE_ICON_CONTRAST) return hex;

  const [h, s, initialL] = rgbToHsl(hexToRgb(hex));
  let l = initialL;
  let candidate = hex;
  while (contrastAgainstWhite(candidate) < MIN_BADGE_ICON_CONTRAST && l > 0) {
    l = Math.max(0, l - LIGHTNESS_STEP);
    candidate = rgbToHex(...hslToRgb(h, s, l));
  }
  return candidate;
}

export const badgeIconColor = ensureReadableOnWhite(definition.colors.body);
