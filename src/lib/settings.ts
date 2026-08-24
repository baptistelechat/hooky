import { emit } from "@tauri-apps/api/event";

export interface HookySettings {
  avatarSize: number;
  debugMode: boolean;
}

export const DEFAULT_SETTINGS: HookySettings = {
  avatarSize: 240,
  debugMode: false,
};

const STORAGE_KEY = "hooky-settings";
export const SETTINGS_EVENT = "hooky-settings";

export function readSettings(): HookySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Écrit en local (persistance) et diffuse aux autres fenêtres Tauri (le pet et les settings
// tournent dans des webviews séparées -- pas de re-render automatique sans cet event).
export function writeSettings(settings: HookySettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  void emit(SETTINGS_EVENT, settings);
}
