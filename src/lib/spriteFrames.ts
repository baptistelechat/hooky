import { CODEX_COLUMNS } from "./codexPets";
import { loadImage } from "./spriteColor";

// Chaque cellule est réduite à une vignette de 16 px et lue par transparence : assez pour
// détecter un dessin, même petit, pour un coût négligeable (8 x rows lectures de 256 pixels).
const PROBE_SIZE = 16;
// Marge ignorée sur chaque bord de cellule : un sprite qui touche le bord déborde en
// anti-aliasing sur la cellule voisine, qui paraîtrait alors non vide.
const CELL_INSET = 0.1;
const MIN_ALPHA = 8;

/** Nombre de frames dessinées par ligne : 1 + l'index de la dernière cellule non vide (une
 * ligne n'en remplit pas toujours 8, le reste est transparent). Mesuré, pas figé : `idle`
 * compte 6 frames sur les pets v1 et 7 sur les v2, les autres lignes coïncident (constaté sur
 * 8 pets installés, cf. LRN-091). */
export async function rowFrameCounts(
  url: string,
  rows: number,
): Promise<number[]> {
  const image = await loadImage(url);
  const cellWidth = image.naturalWidth / CODEX_COLUMNS;
  const cellHeight = image.naturalHeight / rows;

  const canvas = document.createElement("canvas");
  canvas.width = PROBE_SIZE;
  canvas.height = PROBE_SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("canvas 2d indisponible");

  const isCellFilled = (column: number, row: number): boolean => {
    context.clearRect(0, 0, PROBE_SIZE, PROBE_SIZE);
    context.drawImage(
      image,
      (column + CELL_INSET) * cellWidth,
      (row + CELL_INSET) * cellHeight,
      cellWidth * (1 - 2 * CELL_INSET),
      cellHeight * (1 - 2 * CELL_INSET),
      0,
      0,
      PROBE_SIZE,
      PROBE_SIZE,
    );
    const { data } = context.getImageData(0, 0, PROBE_SIZE, PROBE_SIZE);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] >= MIN_ALPHA) return true;
    }
    return false;
  };

  return Array.from({ length: rows }, (_, row) => {
    let frames = 0;
    for (let column = 0; column < CODEX_COLUMNS; column++) {
      if (isCellFilled(column, row)) frames = column + 1;
    }
    return frames;
  });
}
