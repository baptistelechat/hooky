import type { AnimationName } from "../components/avatarDefinition";

/** Un pet Codex tel que renvoyé par la commande Rust `list_codex_pets` (cf.
 * src-tauri/src/codex_pets.rs, qui valide chemin/taille/dimensions avant de l'exposer). */
export interface CodexPet {
  /** Nom du dossier dans `~/.codex/pets` -- identité côté Hooky (l'`id` du `pet.json` peut
   * différer du dossier, collisions possibles). */
  folder: string;
  displayName: string;
  description: string;
  /** Chemin absolu de la spritesheet, déjà autorisé dans le scope du protocole `asset:`. */
  spritesheetPath: string;
  /** 9 (format historique) ou 11 (format v2 ChatGPT) lignes -- 8 colonnes dans les deux cas. */
  rows: number;
  /** Couleur d'icône du badge, calculée côté front à partir des pixels du sprite (cf.
   * spriteColor.ts) -- absente tant que le calcul asynchrone n'a pas abouti (ou s'il échoue). */
  badgeColor?: string;
  /** Frames réellement dessinées par ligne (cf. spriteFrames.ts) -- le nombre varie d'un pet à
   * l'autre (`idle` : 6 en v1, 7 en v2). Absent tant que le calcul n'a pas abouti : on retombe
   * sur `CODEX_ROWS`. */
  rowFrames?: number[];
}

/** Préfixe de l'`avatarId` d'un pet Codex (`codex:<dossier>`) : aucune collision possible avec
 * les ids par défaut (`cubee`...) ni les customs (UUID). */
export const CODEX_AVATAR_PREFIX = "codex:";

export function codexAvatarId(folder: string): string {
  return `${CODEX_AVATAR_PREFIX}${folder}`;
}

/** Pet correspondant à `avatarId` dans `pets` (indexés par dossier), `undefined` si l'id n'est
 * pas un id Codex ou si le pet a disparu du disque. */
export function codexPetForAvatarId(
  avatarId: string,
  pets: Record<string, CodexPet>,
): CodexPet | undefined {
  return avatarId.startsWith(CODEX_AVATAR_PREFIX)
    ? pets[avatarId.slice(CODEX_AVATAR_PREFIX.length)]
    : undefined;
}

/** Cellule d'une spritesheet Codex : 192 x 208 px, 8 colonnes. */
export const CODEX_COLUMNS = 8;
export const CODEX_CELL_ASPECT = 192 / 208;

export type CodexRowName =
  | "idle"
  | "run-right"
  | "run-left"
  | "waving"
  | "jumping"
  | "failed"
  | "waiting"
  | "running"
  | "review";

/** Lignes de la grille (mesurées sur les pets réels, `pet.json` ne les décrit pas -- contrat
 * implicite). `frames` = valeur par défaut, remplacée par le compte réel du pet quand il est
 * connu (`CodexPet.rowFrames`). `fps` = réglage à l'œil : le manifeste n'en donne aucune. */
export const CODEX_ROWS: Record<
  CodexRowName,
  { row: number; frames: number; fps: number }
> = {
  idle: { row: 0, frames: 6, fps: 5 },
  "run-right": { row: 1, frames: 8, fps: 10 },
  "run-left": { row: 2, frames: 8, fps: 10 },
  waving: { row: 3, frames: 4, fps: 6 },
  jumping: { row: 4, frames: 5, fps: 8 },
  failed: { row: 5, frames: 8, fps: 8 },
  waiting: { row: 6, frames: 6, fps: 5 },
  running: { row: 7, frames: 6, fps: 8 },
  review: { row: 8, frames: 6, fps: 5 },
};

/** Niveau B de la table de correspondance : état agrégé (mêmes noms que les animations de
 * Cubee) -> ligne Codex. Seulement les 10 états que Hooky émet réellement (cf. lib.rs) -- le
 * moteur en compte 23, les 13 autres (`excited`, `angry`...) ne sont jamais déclenchés et
 * retombent sur `idle` (cf. `codexRowFor`). À valider visuellement (cf. roadmap, étape 12). */
export const STATE_TO_ROW: Partial<Record<AnimationName, CodexRowName>> = {
  idle: "idle",
  listening: "waiting",
  thinking: "review",
  searching: "review",
  working: "running",
  confused: "failed",
  celebrate: "jumping",
  bored: "idle",
  waking: "waving",
  // Pas de ligne dédiée dans la spritesheet : `idle` ralentie (cf.
  // `codexRowFor`), le badge "zZz" vient d'AnimationOverlay. Pas d'atténuation : essayée à 60 %,
  // elle donnait un pet "transparent en permanence" (sleeping est l'état par défaut).
  sleeping: "idle",
};

/** Ordre d'animations pour une carte de picker (pas de `animationOrder` dans une sheet). */
export const SPRITE_ANIMATION_ORDER = Object.keys(
  STATE_TO_ROW,
) as AnimationName[];

/** Nom de la ligne Codex à jouer : surcharge par hook (niveau C, `codexAnimation` du catalogue)
 * si fournie, sinon repli par état agrégé (niveau B), sinon `idle`. */
export function codexRowNameFor(
  animation: AnimationName,
  override?: CodexRowName,
): CodexRowName {
  return override ?? STATE_TO_ROW[animation] ?? "idle";
}

/** `sleeping` n'a pas de ligne Codex : il joue `idle` en plus lent. Une surcharge
 * explicite (ex. course pendant un drag) reprend la main et joue normalement. */
export function isCodexSleeping(
  animation: AnimationName,
  override?: CodexRowName,
): boolean {
  return animation === "sleeping" && !override;
}

const SLEEPING_FPS_FACTOR = 0.4;

/** Ligne de spritesheet (position, frames, fps) à jouer pour une animation Hooky. */
export function codexRowFor(animation: AnimationName, override?: CodexRowName) {
  const row = CODEX_ROWS[codexRowNameFor(animation, override)];
  return isCodexSleeping(animation, override)
    ? { ...row, fps: row.fps * SLEEPING_FPS_FACTOR }
    : row;
}

/** Durée d'affichage d'une animation sur une carte de picker : deux passages de la ligne,
 * pour qu'une boucle d'une seconde ne soit pas déjà remplacée avant d'avoir été vue. */
export function spriteCycleMs(animation: AnimationName): number {
  const { frames, fps } = codexRowFor(animation);
  return (frames / fps) * 1000 * 2;
}

/** Gris ardoise neutre (contraste ~7.6:1 sur blanc) : repli quand la couleur dominante d'une
 * sheet n'a pas pu être calculée (cf. spriteColor.ts). */
export const SPRITE_BADGE_ICON_COLOR = "#475569";
