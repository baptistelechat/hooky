import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { useSyncExternalStore } from "react";
import { CODEX_AVATAR_PREFIX, type CodexPet } from "../lib/codexPets";
import { dominantBadgeColor } from "../lib/spriteColor";
import { rowFrameCounts } from "../lib/spriteFrames";

const CODEX_PETS_EVENT = "hooky-codex-pets";

// Store module-level (une instance par webview) plutôt qu'un état par hook : `useAvatarBundle`
// est appelé par ~25 cartes de la grille Animation, un scan disque par carte serait absurde.
let pets: Record<string, CodexPet> = {};
let started = false;
const listeners = new Set<() => void>();

// Mesures faites sur les pixels du sprite (couleur de badge, frames par ligne), par chemin de
// spritesheet : calculées une seule fois par webview (lecture via canvas, cf. spriteColor.ts et
// spriteFrames.ts), pas à chaque rescan.
type SpriteMetrics = Pick<CodexPet, "badgeColor" | "rowFrames">;
const spriteMetrics = new Map<string, SpriteMetrics>();
const computingMetrics = new Set<string>();

// Pets dont la spritesheet n'a pas pu être chargée dans CETTE webview (fichier supprimé ou
// corrompu depuis le scan) : retirés du store pour que `getAvatarBundle` retombe sur l'avatar
// par défaut au lieu d'afficher un pet invisible. Vidé à chaque scan reçu des settings, ce qui
// donne une seconde chance à un pet réinstallé.
const brokenFolders = new Set<string>();

function notify() {
  listeners.forEach((listener) => listener());
}

function computeMetrics(pet: CodexPet) {
  const path = pet.spritesheetPath;
  if (spriteMetrics.has(path) || computingMetrics.has(path)) return;
  computingMetrics.add(path);
  const url = convertFileSrc(path, "asset");
  Promise.allSettled([
    dominantBadgeColor(url, pet.rows),
    rowFrameCounts(url, pet.rows),
  ])
    .then(([color, frames]) => {
      for (const result of [color, frames]) {
        if (result.status === "rejected") {
          console.error(
            `[codexPets] mesure de ${pet.folder} indisponible`,
            result.reason,
          );
        }
      }
      const metrics: SpriteMetrics = {
        badgeColor: color.status === "fulfilled" ? color.value : undefined,
        rowFrames: frames.status === "fulfilled" ? frames.value : undefined,
      };
      spriteMetrics.set(path, metrics);
      const current = pets[pet.folder];
      if (current?.spritesheetPath !== path) return;
      pets = { ...pets, [pet.folder]: { ...current, ...metrics } };
      notify();
    })
    .finally(() => computingMetrics.delete(path));
}

function apply(list: CodexPet[]) {
  const available = list.filter((pet) => !brokenFolders.has(pet.folder));
  pets = Object.fromEntries(
    available.map((pet) => [
      pet.folder,
      { ...pet, ...spriteMetrics.get(pet.spritesheetPath) },
    ]),
  );
  notify();
  available.forEach(computeMetrics);
}

/** Retire un pet dont l'image n'a pas pu être chargée (cf. `brokenFolders`) : l'avatar
 * sélectionné retombe alors sur l'avatar par défaut. `avatarId` = `codex:<dossier>`. */
export function reportBrokenCodexPet(avatarId: string): void {
  const folder = avatarId.slice(CODEX_AVATAR_PREFIX.length);
  if (!(folder in pets)) return;
  brokenFolders.add(folder);
  pets = Object.fromEntries(
    Object.entries(pets).filter(([key]) => key !== folder),
  );
  notify();
}

/** Rescanne `~/.codex/pets` et diffuse le résultat aux autres fenêtres : le pet flottant
 * (fenêtre "main") ne rescanne jamais seul, il apprend un nouveau pet quand les settings le
 * détectent -- même mécanique emit/listen que `useSettings`. */
export async function refreshCodexPets(): Promise<void> {
  try {
    const list = await invoke<CodexPet[]>("list_codex_pets");
    apply(list);
    await emit(CODEX_PETS_EVENT, list);
  } catch (error) {
    console.error("[codexPets] scan échoué", error);
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!started) {
    started = true;
    listen<CodexPet[]>(CODEX_PETS_EVENT, (event) => {
      brokenFolders.clear();
      apply(event.payload);
    }).catch((error: unknown) =>
      console.error("[codexPets] listen échoué", error),
    );
    void refreshCodexPets();
  }
  return () => listeners.delete(listener);
}

/** Pets Codex installés, indexés par nom de dossier -- scannés au premier usage dans chaque
 * fenêtre, mis à jour par `refreshCodexPets` (ici ou dans une autre fenêtre). */
export function useCodexPets(): Record<string, CodexPet> {
  return useSyncExternalStore(subscribe, () => pets);
}
