import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { useSyncExternalStore } from "react";
import type { CodexPet } from "../lib/codexPets";
import { dominantBadgeColor } from "../lib/spriteColor";

const CODEX_PETS_EVENT = "hooky-codex-pets";

// Store module-level (une instance par webview) plutôt qu'un état par hook : `useAvatarBundle`
// est appelé par ~25 cartes de la grille Animation, un scan disque par carte serait absurde.
let pets: Record<string, CodexPet> = {};
let started = false;
const listeners = new Set<() => void>();

// Couleur de badge par chemin de spritesheet : calculée une seule fois par webview (lecture
// des pixels via canvas, cf. spriteColor.ts), pas à chaque rescan.
const badgeColors = new Map<string, string>();
const computingBadgeColors = new Set<string>();

function notify() {
  listeners.forEach((listener) => listener());
}

function computeBadgeColor(pet: CodexPet) {
  const path = pet.spritesheetPath;
  if (badgeColors.has(path) || computingBadgeColors.has(path)) return;
  computingBadgeColors.add(path);
  dominantBadgeColor(convertFileSrc(path, "asset"), pet.rows)
    .then((color) => {
      badgeColors.set(path, color);
      const current = pets[pet.folder];
      if (current?.spritesheetPath !== path) return;
      pets = { ...pets, [pet.folder]: { ...current, badgeColor: color } };
      notify();
    })
    .catch((error: unknown) =>
      console.error(`[codexPets] couleur de ${pet.folder} indisponible`, error),
    )
    .finally(() => computingBadgeColors.delete(path));
}

function apply(list: CodexPet[]) {
  pets = Object.fromEntries(
    list.map((pet) => [
      pet.folder,
      { ...pet, badgeColor: badgeColors.get(pet.spritesheetPath) },
    ]),
  );
  notify();
  list.forEach(computeBadgeColor);
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
    listen<CodexPet[]>(CODEX_PETS_EVENT, (event) => apply(event.payload)).catch(
      (error: unknown) => console.error("[codexPets] listen échoué", error),
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
