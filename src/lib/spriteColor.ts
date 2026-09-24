import {
  ensureReadableOnWhite,
  rgbToHex,
  rgbToHsl,
} from "../components/avatarDefinition";
import { CODEX_COLUMNS } from "./codexPets";

// Largeur d'échantillonnage d'une cellule : assez pour une couleur fiable, très peu de pixels
// à parcourir (8 cellules x 24 px de large).
const SAMPLE_CELL_WIDTH = 24;
// Bords anti-aliasés (semi-transparents) ignorés : ils mélangent la couleur du pet et du vide.
const MIN_ALPHA = 200;
// Une couleur est "de caractère" si assez saturée et ni quasi noire ni quasi blanche : sans
// ce filtre, un pet à contour sombre donnerait toujours du gris/noir (le contour est ce
// qu'il y a le plus de pixels), donc un badge sans rapport avec sa couleur reconnaissable.
const MIN_SATURATION = 0.25;
const MIN_LIGHTNESS = 0.15;
const MAX_LIGHTNESS = 0.9;
// Regroupement par PLAGE de teinte (12 plages de 30°), pas par couleur exacte : l'ombrage d'un
// même aplat (ex. un t-shirt vert) éparpille ses pixels en dizaines de nuances proches qui,
// comptées séparément, pèsent chacune trop peu -- mesuré sur un pet réel : le vert pesait 2 %
// en couleurs exactes contre 8 % par plage de teinte.
const HUE_BIN_DEGREES = 30;
const HUE_BIN_COUNT = 360 / HUE_BIN_DEGREES;
// Part minimale de pixels opaques que la plage gagnante doit couvrir pour l'emporter sur le
// repli : quelques pixels d'yeux (~1 % mesuré) ne doivent pas décider de la couleur du badge.
const MIN_CHARACTER_SHARE = 0.03;
// Repli (pet sans couleur de caractère, ex. tout gris) : couleur la plus fréquente, en 4 bits
// par canal.
const FALLBACK_CHANNEL_SHIFT = 4;

interface Accumulator {
  count: number;
  r: number;
  g: number;
  b: number;
}

const emptyAccumulator = (): Accumulator => ({ count: 0, r: 0, g: 0, b: 0 });

function add(accumulator: Accumulator, r: number, g: number, b: number) {
  accumulator.count++;
  accumulator.r += r;
  accumulator.g += g;
  accumulator.b += b;
}

function mean({ count, r, g, b }: Accumulator): string {
  return rgbToHex(r / count, g / count, b / count);
}

function largest(accumulators: Iterable<Accumulator>): Accumulator | undefined {
  let best: Accumulator | undefined;
  for (const accumulator of accumulators) {
    if (!best || accumulator.count > best.count) best = accumulator;
  }
  return best;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // Le protocole `asset:` répond avec `Access-Control-Allow-Origin` (cf. tauri
    // protocol/asset.rs) : sans `anonymous`, le canvas serait "tainted" et illisible.
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`image illisible : ${url}`));
    image.src = url;
  });
}

/** Couleur d'icône de badge pour un pet Codex : couleur de caractère dominante de sa ligne
 * `idle` (première ligne, celle qui représente le pet au repos), assombrie si besoin pour rester
 * lisible sur le fond blanc du badge (même garde WCAG que les avatars procéduraux). */
export async function dominantBadgeColor(
  url: string,
  rows: number,
): Promise<string> {
  const image = await loadImage(url);
  const cellHeight = image.naturalHeight / rows;

  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_CELL_WIDTH * CODEX_COLUMNS;
  canvas.height = Math.round(
    (SAMPLE_CELL_WIDTH * cellHeight) / (image.naturalWidth / CODEX_COLUMNS),
  );
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("canvas 2d indisponible");
  context.drawImage(
    image,
    0,
    0,
    image.naturalWidth,
    cellHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const hueBins = Array.from({ length: HUE_BIN_COUNT }, emptyAccumulator);
  const exactColors = new Map<number, Accumulator>();
  let opaque = 0;
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < MIN_ALPHA) continue;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    opaque++;

    const [hue, saturation, lightness] = rgbToHsl([r, g, b]);
    if (
      saturation >= MIN_SATURATION &&
      lightness >= MIN_LIGHTNESS &&
      lightness <= MAX_LIGHTNESS
    ) {
      add(hueBins[Math.floor(hue / HUE_BIN_DEGREES) % HUE_BIN_COUNT], r, g, b);
    }

    const shift = FALLBACK_CHANNEL_SHIFT;
    const key = ((r >> shift) << 8) | ((g >> shift) << 4) | (b >> shift);
    const exact = exactColors.get(key) ?? emptyAccumulator();
    add(exact, r, g, b);
    exactColors.set(key, exact);
  }
  if (opaque === 0) throw new Error("aucun pixel opaque dans la ligne idle");

  const character = largest(hueBins);
  const winner =
    character && character.count / opaque >= MIN_CHARACTER_SHARE
      ? character
      : largest(exactColors.values());
  if (!winner) throw new Error("aucune couleur dominante");

  return ensureReadableOnWhite(mean(winner));
}
