import type { AnimationName } from "../components/avatarDefinition";

/** Préfixe de l'`avatarId` d'un personnage Dots Lab (`dots:<fichier>`) : aucune collision
 * possible avec les ids par défaut (`cubee`...), les customs (UUID) ni les pets Codex. */
export const DOTS_AVATAR_PREFIX = "dots:";

export function dotsAvatarId(name: string): string {
  return `${DOTS_AVATAR_PREFIX}${name}`;
}

/** Les 8 états d'une planche Dots Lab, dans l'ordre de ses cases (4 x 2, cf. `makeSheet` côté
 * Dots Lab) -- l'ordre fait foi au découpage, pas le libellé affiché sous chaque case. */
export const DOTS_STATES = [
  "idle",
  "listening",
  "thinking",
  "writing",
  "success",
  "alert",
  "error",
  "asleep",
] as const;

export type DotsStateName = (typeof DOTS_STATES)[number];

/** Durée d'une boucle par état (attribut `dur` des planches, identique d'un personnage à
 * l'autre : mesuré sur les planches du repo). */
const DOTS_STATE_MS: Record<DotsStateName, number> = {
  idle: 5500,
  listening: 4000,
  thinking: 5500,
  writing: 3750,
  success: 3200,
  alert: 3000,
  error: 5500,
  asleep: 3400,
};

/** État agrégé Hooky -> état Dots Lab. Seulement les 10 états que Hooky émet réellement (cf.
 * lib.rs), comme `STATE_TO_ROW` pour les pets Codex ; les autres retombent sur `idle`.
 * `searching` et `bored` n'ont pas d'équivalent Dots Lab : repli sur l'état le plus proche. */
export const STATE_TO_DOTS: Partial<Record<AnimationName, DotsStateName>> = {
  idle: "idle",
  listening: "listening",
  thinking: "thinking",
  searching: "thinking",
  working: "writing",
  confused: "error",
  celebrate: "success",
  bored: "idle",
  waking: "alert",
  sleeping: "asleep",
};

/** Ordre d'animations pour une carte de picker (pas de `animationOrder` dans une planche). */
export const DOTS_ANIMATION_ORDER = Object.keys(
  STATE_TO_DOTS,
) as AnimationName[];

export function dotsStateFor(animation: AnimationName): DotsStateName {
  return STATE_TO_DOTS[animation] ?? "idle";
}

/** Durée d'affichage d'une animation sur une carte de picker : une boucle complète de l'état. */
export function dotsCycleMs(animation: AnimationName): number {
  return DOTS_STATE_MS[dotsStateFor(animation)];
}

/** Côté du canevas d'un état dans une planche (chaque case y est réduite de moitié). */
const DOTS_CANVAS_SIZE = 512;
const SVG_NS = "http://www.w3.org/2000/svg";

export interface DotsSheet {
  /** Couleur du corps, lue sur la planche (sert au badge d'état). */
  color?: string;
  /** Un SVG autonome par état. */
  states: Record<DotsStateName, string>;
}

/** Découpe une planche « Copy SVG sheet » de Dots Lab en 8 SVG autonomes, un par état.
 * Afficher la planche entière recadrée sur une case laisserait tourner les 7 autres animations
 * pour rien. Renvoie `null` si le fichier n'a pas la forme attendue (8 cases).
 *
 * Les `<defs>` sont partagés par toute la planche mais préfixés par case (`e0…` à `e7…`) : on
 * ne garde pour chaque état que les siens, sinon chaque SVG embarquerait ceux des 7 autres. */
export function splitDotsSheet(sheet: string): DotsSheet | null {
  const doc = new DOMParser().parseFromString(sheet, "image/svg+xml");
  const root = doc.documentElement;
  if (root.localName !== "svg" || doc.querySelector("parsererror")) return null;

  const children = Array.from(root.children);
  const cells = children.filter((child) => child.localName === "g");
  if (cells.length !== DOTS_STATES.length) return null;
  const defs = children
    .filter((child) => child.localName === "defs")
    .flatMap((child) => Array.from(child.children));

  const serializer = new XMLSerializer();
  const states = {} as Record<DotsStateName, string>;
  DOTS_STATES.forEach((state, index) => {
    const svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${DOTS_CANVAS_SIZE} ${DOTS_CANVAS_SIZE}`);
    const stateDefs = doc.createElementNS(SVG_NS, "defs");
    for (const def of defs) {
      if (def.id.startsWith(`e${index}`)) {
        stateDefs.appendChild(def.cloneNode(true));
      }
    }
    svg.appendChild(stateDefs);
    // Les enfants de la case, sans son `translate(...) scale(.5)` de mise en grille.
    for (const frame of Array.from(cells[index].children)) {
      svg.appendChild(frame.cloneNode(true));
    }
    states[state] = serializer.serializeToString(svg);
  });

  const color = root.querySelector("use[fill]")?.getAttribute("fill");
  return {
    color: color && /^#[0-9a-f]{6}$/i.test(color) ? color : undefined,
    states,
  };
}
