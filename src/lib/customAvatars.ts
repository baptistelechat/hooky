import { emit } from "@tauri-apps/api/event";
import type { RawAvatarDefinition } from "../components/avatarDefinition";

const STORAGE_KEY = "hooky-custom-avatars";
export const CUSTOM_AVATARS_EVENT = "hooky-custom-avatars";

export type CustomAvatars = Record<string, RawAvatarDefinition>;

export function readCustomAvatars(): CustomAvatars {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// Même pattern que writeSettings (lib/settings.ts) : persistance locale + diffusion aux
// autres fenêtres Tauri (pet flottant + settings tournent dans des webviews séparées).
export function writeCustomAvatars(customAvatars: CustomAvatars): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customAvatars));
  void emit(CUSTOM_AVATARS_EVENT, customAvatars);
}
